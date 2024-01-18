import React, { Component } from 'react';

import "./stylesheets/Index.css";

import sendData from './util/sendData';
import Login from './Login';
import Signup from './Signup';

class Index extends Component {
    constructor(props) {
        super(props);
        this.state = {
            login: true, // true-login, false-signup

            loginRef: React.createRef(),
            signupRef: React.createRef(),

            alerts: [],

        }

        this.switchPage = this.switchPage.bind(this);
        this.keySubmit = this.keySubmit.bind(this);
        this.closeAlert = this.closeAlert.bind(this);
        this.customAlert = this.customAlert.bind(this);
        this.applyDecay = this.applyDecay.bind(this);
    }

    async componentDidMount() {
        window.addEventListener('keyup', this.keySubmit)
        // Check login
        try {
            const checkLogin = await sendData('/auth', {});
            if (checkLogin.status === 'success') {
                window.location.href = '/dashboard';
            }

        } catch(err) {
            console.error(err);
        }
    }

    
    componentWillUnmount() {
        window.removeEventListener('keyup', this.keySubmit);
    }
    keySubmit(e) {
        if (e.key === 'Enter') {
            if (this.state.login) {
                this.state.loginRef.current.submitData();
            } else {
                this.state.signupRef.current.submitData();
            }
        }
    }
    
    switchPage() {
        this.setState({
            login: !this.state.login,
        });
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

    render() {
        return (
            <div className='Index'>
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
                        <Login ref={this.state.loginRef} switchPage={this.switchPage} loginBtnText={this.state.loginBtnText} customAlert={this.customAlert} />
                        <Signup ref={this.state.signupRef} switchPage={this.switchPage} signupBtnText={this.state.signupBtnText} customAlert={this.customAlert} />
                    </div>
                </div>
            </div>
        )
    }
}

export default Index;