import React, { Component } from 'react';
import sendData from './util/sendData';

import Input from './Input';

class Login extends Component {
    constructor(props) {
        super(props);
        this.state = {
            username: '',
            password: '',
            loginBtnText: 'Log in',
        }

        this.changeUsername = this.changeUsername.bind(this);
        this.changePassword = this.changePassword.bind(this);
        this.submitData = this.submitData.bind(this);
    }

    changeUsername(value) {
        this.setState({
            username: value,
        });
    }
    
    changePassword(value) {
        this.setState({
            password: value,
        });
    }

    submitData() {
        this.login({username: this.state.username, password: this.state.password})
    }
    async login(data) {
        // Check login
        try {
            this.setState({
                loginBtnText: 'Loading...',
            });
            const checkLogin = await sendData('/login', {username: data.username, password: data.password});
            if (checkLogin.status === 'success') {
                return window.location.href = '/dashboard';
            }
            this.setState({
                loginBtnText: 'Log in',
            });
            //alert(checkLogin.message);
            this.props.customAlert(checkLogin.message, false);

        } catch(err) {
            console.error(err);
        }
    }

    render() {
        return (
            <div className="Login">
                <h1>Log in</h1>
                <div className='hr' style={{width: "calc(100px + 40%)"}}></div>
                <Input onInput={this.changeUsername} className="indexLogin" placeholder={"Username or Email"} type="text" />
                <Input onInput={this.changePassword} className="indexLogin" placeholder={"Password"} type="password" />
                <div onClick={this.submitData} className='btn' style={{backgroundColor: "#4A7C59", color: "#FFFFFF"}}>{this.state.loginBtnText}</div>
                <div style={{marginTop: "3vh", fontSize: "1.7vh"}}><a style={{color: "white", textDecoration: "none" }} href='/forgotpassword'>Forgot Passowrd?</a></div>
                <div style={{marginTop: "3vh", marginBottom: 5, fontSize: "1.7vh"}}>Don't have an account yet?</div>
                <div onClick={this.props.switchPage} className='btn' style={{backgroundColor: "#DFDFDF", color: "#222222"}}>Create an account!</div>
            </div>
        );
    }
}

export default Login;