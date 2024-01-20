import React, { Component } from 'react';

class LockedInput extends Component {
    constructor(props) {
        super(props);
        this.state = {
            showPassword: false,
            copied: false,
        }

        this.onInput = this.onInput.bind(this);
        this.showPassword = this.showPassword.bind(this);
        this.copyToClipboard = this.copyToClipboard.bind(this);
        this.hidePassword = this.hidePassword.bind(this);
        this.generatePassword = this.generatePassword.bind(this);
    }

    onInput(e) {
        this.props.onInput(e.target.value);
    }

    async showPassword() {
        const decrypted = await this.props.requestdecrypt(this.props.site);

        if (decrypted) {
            this.setState({
                showPassword: !this.state.showPassword,
            });
        }
    }

    hidePassword() {
        this.setState({
            showPassword: false,
        });
    }

    async copyToClipboard() {
        if (this.props.type === 'password' && this.props.encrypted) {
            const pswd = await this.props.requestdecrypt();
            if (pswd) {
                navigator.clipboard.writeText(pswd);
                this.props.customAlert('Copied to clipboard.', true);
                return;
            } else {
                this.props.customAlert('Error fetching password. Please try again later.', false);
                return;
            }
            
        }
        navigator.clipboard.writeText(this.props.value);
        this.props.customAlert('Copied to clipboard.', true);
        this.setState({
            copied: !this.state.copied,
        });
    }

    generatePassword() {
        const specialCharacters = '!$*#';
        
        // Generate random numbers and special characters
        const randomNumber = Math.floor(Math.random() * 10);
        const randomSpecialChar = specialCharacters.charAt(Math.floor(Math.random() * specialCharacters.length));
        
        // Generate the rest of the string with random characters
        const randomString = Array.from({ length: 12 }, () => Math.random().toString(36).charAt(2)).join('');
        
        // Insert the random number and special character at specific positions
        const result = `${randomString.slice(0, 4)}-${randomString.slice(4, 8)}-${randomString.slice(8, 12)}`;
        
        // Ensure at least one number and one special character are present
        const finalResult = result.replace(/[0-9]/, randomNumber).replace(/[a-z]/, randomSpecialChar);
      
        this.onInput({target: {value: finalResult}});
      }

    render() {
            let value = this.props.value ? this.props.value : "";
            if (this.props.type === 'password') {
                if (this.props.encrypted) {
                    value = "PASSWORDPASSWORD";
                }
            }
        return (
            <div className={'LockedInput ' + this.props.className} style={{width: this.props.width}}>
                <div className='placeholder' style={{color: this.props.value ? this.props.value.length > 0 ? "transparent" : "#B4D0DF" : "#B4D0DF"}}>{this.props.placeholder}</div>
                <input type={this.state.showPassword ? "text" : this.props.type} onInput={this.onInput} value={value} style={{pointerEvents: this.props.locked ? "none" : "all", color: this.props.locked ? "#4984A4" : "white"}} />
                <img onClick={this.showPassword} className='eye' style={{display: this.props.type === "password" ? "block" : "none"}} src='/images/icons/eye.svg' alt='eye'/>
                <img className={'copy ' + this.state.copied} onClick={this.copyToClipboard} style={{display: this.props.copy ? "block" : "none"}} src='/images/icons/copy.svg' alt='copy to clipboard' />
                <img className={`wand ${this.props.locked ? "hidden" : !this.props.wand ? "hidden" : "visible"}`} onClick={this.generatePassword} src='/images/icons/wand.svg' alt='generate random password' />
            </div>
        );
    }
}

export default LockedInput;