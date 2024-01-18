import React, { Component } from 'react';
import sendData from './util/sendData';

class SideBar extends Component {
    constructor(props) {
        super(props);

         this.state = {
            form: {
                username: this.props.user.username,
                email: this.props.user.email,
                password: '',
                newPassword: '',
            }
         }

         this.toggle = this.toggle.bind(this);
         this.logout = this.logout.bind(this);
         this.changeValue = this.changeValue.bind(this);
         this.saveUsername = this.saveUsername.bind(this);
         this.saveEmail = this.saveEmail.bind(this);
         this.savePassword = this.savePassword.bind(this);
    }

    toggle() {
        this.props.toggle();
        // this.props.customAlert("Username successfully changed.", true) // Testing alert message
    }

    logout() {
        this.props.logout();
    }

    changeValue(e, section) {
        this.setState({
            form: {
                username: section==='username' ? e.target.value : this.state.form.username,
                email: section==='email' ? e.target.value : this.state.form.email,
                password: section==='password' ? e.target.value : this.state.form.password,
                newPassword: section==='newPassword' ? e.target.value : this.state.form.newPassword,
            }
        })
    }

    async saveUsername() {
        const newValue = this.state.form.username;
        try {
            const response = await sendData('/dashboard/changeemail', {newValue});
            if (response.status === 'success') {
                // Update username in app
                const user = this.props.user;
                user.username = newValue;
                this.props.editUser(user);
                this.props.customAlert("Username successfully changed.", true)
                return;
            } else {
                this.props.customAlert(response.message, false);
            }
        } catch(err) {
            console.error(err);
        }
    }

    async saveEmail() {
        const newValue = this.state.form.email;
        try {
            const response = await sendData('/dashboard/changeemail', {newValue});
            if (response.status === 'success') {
                // Update username in app
                const user = this.props.user;
                user.email = newValue;
                user.settings.emailVerified = false;
                this.props.editUser(user);
                this.props.customAlert("Email changed. Please verify your email.", true)
            } else {
                this.props.customAlert(response.message, false);
            }
        } catch(err) {
            console.error(err);
        }
    }

    async savePassword() {
        const password = this.state.form.password;
        const newValue = this.state.form.newPassword;
        try {
            const response = await sendData('/login/changepassword', {password, newValue});
            if (response.status === 'success') {
                this.props.customAlert("Password successfully changed.", true);
            } else {
                this.props.customAlert(response.message, false);
            }
            this.setState({
                password: '',
                newPassword: '',
            })
        } catch(err) {
            console.error(err);
        }
    }

    async resendEmail() {
        try {
            const response = await sendData('/dashboard/resendemail', {});
            if (response.status === 'success') {
                this.props.customAlert("Email sent.", true);
            } else {
                this.props.customAlert(response.message, false);
            }
        } catch(err) {
            console.error(err);
        }
    }

    render() {
        return (
            <div className={`SideBar ${this.props.sideBar}`}>
                <img onClick={this.toggle} className='closeSideBar' src='/images/icons/x.svg' alt='Close sidebar' />
                <div className='profileImage'>
                    <img src='/images/darkLock.svg' alt='lock' />
                    <h2>{this.props.user.username}</h2>
                </div>
                <h4>Settings</h4>
                <div onClick={this.logout} className='logoutBtn'>
                    Logout
                </div>

                {/* Personal information */}
                <h4>Personal information</h4>

                <div className='inputSection'>
                    <span>Change username</span>
                    <input onInput={(e) => this.changeValue(e, 'username')} placeholder='Username' value={this.state.form.username} />
                    <div onClick={this.saveUsername} className={`saveBtn ${this.props.user.username !== this.state.form.username}`}>Save</div>
                </div>

                <div className='inputSection'>
                    <span>Change email</span>
                    <input onInput={(e) => this.changeValue(e, 'email')} placeholder='Email' value={this.state.form.email} />
                    <div onClick={this.saveEmail} className={`saveBtn ${this.props.user.email !== this.state.form.email}`}>Save</div>
                    { this.props.user.settings.emailVerified ? (
                    <div className='underEmail verified'>
                        Verified
                    </div>) : (
                    <div className='underEmail notverified'>
                        Please verify your email to enhance account security and safeguard your valuable Keypass Guard account. <span onClick={this.resendEmail} className='resendEmail'>Resend email</span>
                    </div>)}
                </div>
                <div className='inputSection'>
                    <span>Change password</span>
                    <input onInput={(e) => this.changeValue(e, 'password')} placeholder='Password' value={this.state.form.password} type='password'/>
                    <input onInput={(e) => this.changeValue(e, 'newPassword')} placeholder='New password' value={this.state.form.newPassword} type='password'/>
                    <div onClick={this.savePassword} className={`saveBtn ${this.state.form.newPassword.length >= 8 && this.state.form.newPassword !== this.state.form.password}`}>Save</div>
                </div>


            </div>
        );
    }
}

export default SideBar;