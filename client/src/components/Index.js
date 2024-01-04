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

        }

        this.switchPage = this.switchPage.bind(this);
        this.keySubmit = this.keySubmit.bind(this);
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

    render() {
        return (
            <div className='Index'>
                <div className='leftSide'>
                    <div className='title'>
                        <img src='/images/logo.svg' alt='Keypass Guard' />
                        <h2>Securely retain your passwords</h2>
                    </div>
                </div>
                <img src='/images/verticalLine.svg' style={{height: "100vh", width: 2}} alt='Split' />
                <div className='rightSide'>
                    <div className={`slide ${this.state.login}`}>
                        <Login ref={this.state.loginRef} switchPage={this.switchPage} loginBtnText={this.state.loginBtnText} />
                        <Signup ref={this.state.signupRef} switchPage={this.switchPage} signupBtnText={this.state.signupBtnText} />
                    </div>
                </div>
            </div>
        )
    }
}

export default Index;