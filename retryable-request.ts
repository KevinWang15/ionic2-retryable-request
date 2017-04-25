import {Http, Response} from "@angular/http";
import {ToastController, LoadingController, AlertController, Loading, Alert} from "ionic-angular";

export class RetryableRequest {
  constructor(private http: Http, public loadingCtrl: LoadingController, private alertCtrl: AlertController) {
  }

  make(url: string, params: any) {
    let loading: Loading = this.loadingCtrl.create({
      content: 'Loading..'
    });
    loading.present();

    return new Promise((resolve, reject) => {
      let completed: boolean = false;
      let isPromiseFulfilled: boolean = false;
      let alertShown: boolean = false;
      let alert: Alert = null;

      this.http
        .post(url, params)
        .subscribe(
          (res: Response) => {
            let body = res.json();
            if (!isPromiseFulfilled) {
              isPromiseFulfilled = true;
              resolve(body || {});
            }
            doFinally();
          },
          (error: Response | any) => {
            let reason = error.json() || {};
            if (!isPromiseFulfilled) {
              isPromiseFulfilled = true;
              reject(reason);
            }
            doFinally();
          });

      let doFinally = function () {
        completed = true;
        loading.dismiss();
        if (alertShown) {
          alert.dismiss();
        }
      };

      setInterval(() => {
        if (!completed && !alertShown) {
          alertShown = true;
          alert = this.alertCtrl.create({
            title: 'Server not responding..',
            message: 'What do you wish to do?',
            buttons: [
              {
                text: 'Abort',
                handler: () => {
                  alertShown = false;
                  if (!completed && !isPromiseFulfilled) {
                    loading.dismiss();
                    completed = true;
                    isPromiseFulfilled = true;
                    reject({});
                  }
                }
              },
              {
                text: 'Retry',
                handler: () => {
                  alertShown = false;
                  if (!completed) {
                    loading.dismiss();
                    completed = true;
                    this.make(url, params).then(
                      value => {
                        if (!isPromiseFulfilled) {
                          isPromiseFulfilled = true;
                          resolve(value);
                        }
                      }, reason => {
                        if (!isPromiseFulfilled) {
                          isPromiseFulfilled = true;
                          reject(reason);
                        }
                      }
                    );
                  }
                }
              },
              {
                text: 'Wait',
                handler: () => {
                  alertShown = false;
                }
              }
            ]
          });
          alert.present();
        }
      }, 5000);
    });
  }
}
