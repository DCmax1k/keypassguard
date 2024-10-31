import React, { Component } from 'react';
import Input from './Input';
import { Link } from 'react-router-dom';
import sendData from './util/sendData';

class ForgotPassword extends Component {
    constructor(props) {
        super(props);
        this.state = { 
            step: 1, // 1: enter email, 2:enter code, 3: reset password

            alerts: [],
            
            emailInput: "",
            codeInput: "",
            passwordInput: "",
            confirmPasswordInput: "",

            loginBtnText: "Send Code"
         };

        this.customAlert = this.customAlert.bind(this);
        this.changeEmailInput = this.changeEmailInput.bind(this);
        this.changeCode = this.changeCode.bind(this);
        this.changePassword = this.changePassword.bind(this);
        this.changeConfirmPassword = this.changeConfirmPassword.bind(this);
        this.submitData = this.submitData.bind(this);
        this.submitCode = this.submitCode.bind(this);
        this.requestCode = this.requestCode.bind(this);
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
    changeCode(e) {
        console.log(e);
        this.setState({
            codeInput: e,
        });
    }
    changePassword(e) {
        console.log(e);
        this.setState({
            passwordInput: e,
        });
    }
    changeConfirmPassword(e) {
        console.log(e);
        this.setState({
            confirmPasswordInput: e,
        });
    }
    

    submitData() {
        if (!this.state.emailInput) return this.customAlert("Email cannot be blank.", false);
        this.requestCode({email: this.state.emailInput})
    }
    submitCode() {
        if (this.state.codeInput.length !== 6) return this.customAlert("Please input the full 6-digit code!", false);
        this.checkCode({code: this.state.codeInput})
    }

    async requestCode(data) {
        // Check login
        try {
            this.setState({
                loginBtnText: 'Loading...',
            });
            const checkLogin = await sendData('/dashboard/requesttemperarycode', {email: data.email});
            if (checkLogin.status === 'error') {
                this.customAlert(checkLogin.message, false);
            }
            this.setState({
                loginBtnText: 'Send Code',
            });
            
            if (checkLogin.status === 'success') {
                // Show next input for inputting code
                this.setState({
                    step: 2,
                });
            }


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
                        <div className='hr' style={{width: "calc(100px + 40%)"}}>

                            {this.state.step === 1 ? (
                                <div key={1}>
                                    <p style={{width: '100%', textAlign: 'center', marginTop: "2vh", marginBottom: "3vh"}}>Enter your email and we’ll send you instructions to reset your password.</p>
                                    <Input  onInput={this.changeEmailInput} className="indexLogin" placeholder={"Email"} type="email" value={this.state.emailInput} width={"100%"} />
                                    <div onClick={this.submitData} className='btn' style={{backgroundColor: "#4A7C59", color: "#FFFFFF", width: 'fit-content', margin: "0 auto"}}>{this.state.loginBtnText}</div>
                                </div>
                            ) : this.state.step === 2 ? (
                                <div key={2}>
                                    <p style={{width: '100%', textAlign: 'center', marginTop: "2vh", marginBottom: "3vh"}}>Enter the code that was sent to your inbox.</p>
                                    <Input onInput={this.changeCode} className="indexLogin" placeholder={"Code"} type="text" value={this.state.codeInput} width={"100%"} />
                                    <div onClick={this.submitCode} className='btn' style={{backgroundColor: "#4A7C59", color: "#FFFFFF", width: 'fit-content', margin: "0 auto"}}>Submit</div>
                                </div>
                            ) : this.state.step === 3 ? (
                                <div key={3}>
                                    <Input  onInput={this.changePassword} className="indexLogin" placeholder={"New Password"} type="password" width={"100%"} />
                                    <Input onInput={this.changeConfirmPassword} className="indexLogin" placeholder={"Confirm Password"} type="password" />
                                    <div onClick={this.submitChangePassword} className='btn' style={{backgroundColor: "#4A7C59", color: "#FFFFFF", width: 'fit-content', margin: "0 auto"}}>Submit</div>
                                </div>
                            ) : null}
                        </div>

                        <div style={{marginTop: "8vh", fontSize: "1.7vh"}}><a style={{color: "white", textDecoration: "underline" }} href='/'>Back to the login screen</a></div>
                    </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default ForgotPassword;