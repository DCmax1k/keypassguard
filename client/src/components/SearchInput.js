import React, { Component } from 'react';

class SearchInput extends Component {
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
            <div className='SearchInput' style={{width: this.props.width}}>
                <div className='placeholder' style={{color: this.state.value.length > 0 ? "transparent" : "#868686"}}>{this.props.placeholder}</div>
                <input type="text" onInput={this.onInput} value={this.state.value} />
                <img className='searchIcon' src='/images/icons/search.svg' alt='eye'/>
            </div>
        );
    }
}

export default SearchInput;