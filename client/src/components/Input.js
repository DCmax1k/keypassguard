import React, { Component } from 'react';

class Input extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value: "",
            showPassword: false,
        }

        this.onInput = this.onInput.bind(this);
        this.showPassword = this.showPassword.bind(this);
    }

    onInput(e) {
        this.props.onInput(e.target.value);
        this.setState({
            value: e.target.value,
        });
    }

    showPassword() {
        this.setState({
            showPassword: !this.state.showPassword,
        });
    }

    render() {
        return (
            <div className={'Input ' + this.props.className} style={{width: this.props.width}}>
                <div className='placeholder' style={{color: this.state.value.length > 0 ? "transparent" : "#868686"}}>{this.props.placeholder}</div>
                <input type={this.state.showPassword ? "text" : this.props.type} onInput={this.onInput} value={this.state.value} />
                <img onClick={this.showPassword} className='eye' style={{display: this.props.type === "password" ? "block" : "none"}} src='/images/icons/eye.svg' alt='eye'/>
            </div>
        );
    }
}

export default Input;