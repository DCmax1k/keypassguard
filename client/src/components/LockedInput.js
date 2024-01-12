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
    }

    onInput(e) {
        this.props.onInput(e.target.value);
    }

    showPassword() {
        this.setState({
            showPassword: !this.state.showPassword,
        });
    }

    copyToClipboard() {
        navigator.clipboard.writeText(this.props.value);
        this.setState({
            copied: !this.state.copied,
        });
    }

    render() {
        return (
            <div className={'LockedInput ' + this.props.className} style={{width: this.props.width}}>
                <div className='placeholder' style={{color: this.props.value ? this.props.value.length > 0 ? "transparent" : "#B4D0DF" : "#B4D0DF"}}>{this.props.placeholder}</div>
                <input type={this.state.showPassword ? "text" : this.props.type} onInput={this.onInput} value={this.props.value ? this.props.value : ""} style={{pointerEvents: this.props.locked ? "none" : "all", color: this.props.locked ? "#4984A4" : "white"}} />
                <img onClick={this.showPassword} className='eye' style={{display: this.props.type === "password" ? "block" : "none"}} src='/images/icons/eye.svg' alt='eye'/>
                <img className={'copy ' + this.state.copied} onClick={this.copyToClipboard} style={{display: this.props.copy ? "block" : "none"}} src='/images/icons/copy.svg' alt='copy to clipboard' />
            </div>
        );
    }
}

export default LockedInput;