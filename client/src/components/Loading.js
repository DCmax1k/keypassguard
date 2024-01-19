import React, { Component } from 'react';

class Loading extends Component {
    constructor(props) {
        super(props);
        this.state = { 
            fadeOut: false,
         };
    }
    
    componentDidMount() {
        if (this.props.redirect) {
            setTimeout(() => {
                this.fadeOut();
                setTimeout(() => {
                    window.location.href = this.props.redirect;
                }, 300)
            }, 1500);
        }
    }

    fadeOut() {
        this.setState({
            fadeOut: true,
        });
    }
    

    render() {
        return (
            <div className={`Loading ${this.state.fadeOut ? 'fadeOut' : ''}`}>
                <img className='loading' src='/images/loading.svg' alt='loading' />
                {this.props.loadingText}
            </div>
        );
    }
}

export default Loading;