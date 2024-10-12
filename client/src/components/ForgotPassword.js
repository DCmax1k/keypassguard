import React, { Component } from 'react';
import Input from './Input';
import { Link } from 'react-router-dom';
import sendData from './util/sendData';

class ForgotPassword extends Component {
    constructor(props) {
        super(props);
        this.state = { 
            alerts: [],
            emailInput: "",
            loginBtnText: "Send Code"
         };

        this.customAlert = this.customAlert.bind(this);
        this.changeEmailInput = this.changeEmailInput.bind(this);
        this.submitData = this.submitData.bind(this);
    }

    customAlert(message, good) {
        const id = Math.random() + '' + Date.now();
        const alerts = this.state.alerts;
        const alert = {
            id,
            txt: message,
            status: good,
            animate: false,
        };
        alerts.push(alert);
        this.setState({
            alerts,
        });

        if (alerts.length === 1) {
            this.applyDecay(alert);
        }
    }

    closeAlert(alert) {
        const alerts = this.state.alerts;
        let ind = alerts.findIndex((alrt) => alrt.id === alert.id);
        if (ind < 0) return;
        alerts[ind].animate = true;
        this.setState({
            alerts,
        });
        setTimeout(() => {
            const updatedAlerts = this.state.alerts;
            updatedAlerts.splice(ind, 1);
            this.setState({
                alerts: updatedAlerts,
            });

            if (updatedAlerts.length > 0) {
                this.applyDecay(updatedAlerts[0]);
            }
        }, 300);
    }
    applyDecay(alert) {
        setTimeout(() => {
            this.closeAlert(alert);
        }, 3000);
    }

    changeEmailInput(e) {
        console.log(e);
        this.setState({
            emailInput: e,
        });
    }
    submitData() {
        if (!this.state.emailInput) return this.customAlert("Email cannot be blank.", false);
        this.requestCode({email: this.state.emailInput})
    }
    async requestCode(data) {
        // Check login
        try {
            this.setState({
                loginBtnText: 'Loading...',
            });
            const checkLogin = await sendData('/requesttemperarycode', {email: data.email});
            if (checkLogin.status === 'success') {
                return window.location.href = '/dashboard';
            }
            this.setState({
                loginBtnText: 'Send Code',
            });
            //alert(checkLogin.message);
            this.props.customAlert(checkLogin.message, false);

        } catch(err) {
            console.error(err);
        }
    }

    render() {
        return (
            <div className='ForgotPassword'>
                {/* Alert messages */}
                <div className='alerts'>
                    {this.state.alerts.filter((al, i) => i===0).map((alert, i) => {
                        // Auto close alert after 10 seconds
                        return (
                        <div className={`alert ${alert.status} ${alert.animate ? 'animate' : ''}`} key={alert.id}>
                            <img onClick={() => this.closeAlert(alert)} src={alert.status ? '/images/icons/greenHollowX.svg' : '/images/icons/redHollowX.svg'} alt='Close notification' />
                            {alert.txt}
                        </div>
                        )
                    })}
                </div>

                {/* INDEX */}
                <div className='leftSide'>
                    <div className='title'>
                        <img src='/images/logo.svg' alt='Keypass Guard' />
                        <h2>Securely retain your passwords</h2>
                    </div>
                </div>
                <img src='/images/verticalLine.svg' style={{height: "100vh", width: 2}} alt='Split' />
                <div className='rightSide'>
                    <div className={`slide ${this.state.login}`}>
                    <div className="Login">
                        <h1>Forgot Password</h1>
                        <div className='hr' style={{width: "calc(100px + 40%)"}}></div>
                        <p style={{width: '50%', textAlign: 'center', marginTop: "-2vh", marginBottom: "3vh"}}>Enter yoor email and we’ll send you instructions to reset your password.</p>
                        <Input onInput={this.changeEmailInput} className="indexLogin" placeholder={"Email"} type="email" />
                        <div onClick={this.submitData} className='btn' style={{backgroundColor: "#4A7C59", color: "#FFFFFF"}}>{this.state.loginBtnText}</div>
                        <div style={{marginTop: "8vh", fontSize: "1.7vh"}}><a style={{color: "white", textDecoration: "underline" }} href='/'>Back to the login screen</a></div>
                    </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default ForgotPassword;