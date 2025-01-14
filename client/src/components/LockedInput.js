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
        const length = 12;
        if (length < 4) {
          throw new Error("Password length must be at least 4 to include all required character types.");
        }
      
        const specialChars = "!$*#";
        const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
        const numbers = "0123456789";
      
        // Ensure the password includes at least one of each required character type
        const requiredChars = [
          specialChars[Math.floor(Math.random() * specialChars.length)],
          uppercaseChars[Math.floor(Math.random() * uppercaseChars.length)],
          lowercaseChars[Math.floor(Math.random() * lowercaseChars.length)],
          numbers[Math.floor(Math.random() * numbers.length)],
        ];
      
        // Fill the rest of the password with random characters from all sets
        const allChars = specialChars + uppercaseChars + lowercaseChars + numbers;
        while (requiredChars.length < length) {
          requiredChars.push(allChars[Math.floor(Math.random() * allChars.length)]);
        }
      
        // Shuffle the array to randomize character order
        for (let i = requiredChars.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [requiredChars[i], requiredChars[j]] = [requiredChars[j], requiredChars[i]];
        }
      
        // Join the array into a string and return it
        const randomString = requiredChars.join('');
        const finalResult = `${randomString.slice(0, 4)}-${randomString.slice(4, 8)}-${randomString.slice(8, 12)}`;


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