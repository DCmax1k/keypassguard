import React, { Component } from 'react';
import LockedInput from './LockedInput';
import sendData from './util/sendData';

class EditSite extends Component {
    constructor(props) {
        super(props);
        this.state = {
            id: '',
            name: '',
            username: '',
            password: '',
            note: '',

            inputsLocked: true,
        }

        this.changeName = this.changeName.bind(this);
        this.changeUsername = this.changeUsername.bind(this);
        this.changePassword = this.changePassword.bind(this);
        this.changeNote = this.changeNote.bind(this);
        this.goBack = this.goBack.bind(this);
        this.unlockEdit = this.unlockEdit.bind(this);
        this.updateParentSite = this.updateParentSite.bind(this);
        this.deleteSite = this.deleteSite.bind(this);
    }

    setSite(site) {
        this.setState({
            id: site.id,
            name: site.name,
            username: site.username,
            password: site.password,
            note: site.note,
        });
    }

    updateParentSite() {
        const site = this.getCurrentSite();
        console.log("Updatig parent with: ");
        console.log(site);
        this.props.updateParentSite(site);
    }

    getCurrentSite() {
        return {
            id: this.state.id,
            name: this.state.name,
            username: this.state.username,
            password: this.state.password,
            note: this.state.note,
        }
    }

    changeName(name) {
        this.setState({
            name,
        });
    }
    changeUsername(username) {
        this.setState({
            username,
        });
    }
    changePassword(password) {
        this.setState({
            password,
        });
    }
    changeNote(note) {
        this.setState({
            note,
        });
    }

    goBack() {
        this.props.goBack();
        this.setState({
            inputsLocked: true,
        });
    }

    unlockEdit() {
        if (!this.state.inputsLocked) {
            // Edit done, update parent
            this.updateParentSite();
        }
        this.setState({
            inputsLocked: !this.state.inputsLocked,
        });
    }

    deleteSite() {
        const confirming = window.confirm(`Are you sure you want to delete your saved information for ${this.state.name.length > 0 ? this.state.name : "Unamed site"}`);
        if (confirming) this.actuallyDeleteSite();
    }

    async actuallyDeleteSite() {
        try {
            const site = this.getCurrentSite();
            const response = await sendData('/dashboard/deletesite', {site});
            if (response.status === 'success') {
                this.goBack();
                this.props.deleteSite(site);
            }
        } catch(err) {
            console.error(err);
        }
    }

    render() {
        return (
            <div className={`EditSite ${this.props.open ? 'open' : 'closed'}`} >
                <div className='body'>
                    <img onClick={this.goBack} className={'leftArrow ' + this.state.inputsLocked} src='/images/icons/arrowRight.svg' alt='Left arrow' />
                    <div className='row full'>
                        <LockedInput className='siteName' value={this.state.name} onInput={this.changeName} placeholder={'ex. keypassguard.com'} type={'text'} copy={false} locked={this.state.inputsLocked} />
                    </div>
                    <div className='row'>
                        <span>Username</span>
                        <LockedInput className='username' value={this.state.username} onInput={this.changeUsername} placeholder={''} type={'text'} copy={true} locked={this.state.inputsLocked} />
                    </div>
                    <div className='row'>
                        <span>Password</span>
                        <LockedInput className='password' value={this.state.password} onInput={this.changePassword} placeholder={''} type={'password'} copy={true} locked={this.state.inputsLocked} />
                    </div>
                    <div className='row'>
                        <span>Note</span>
                        <LockedInput className='note' value={this.state.note} onInput={this.changeNote} placeholder={''} type={'text'} copy={false} locked={this.state.inputsLocked} />
                    </div>
                    <div className='row'>
                        <div></div>
                        <div onClick={this.unlockEdit} className='hollowBtn'>{this.state.inputsLocked ? "Edit" : "Done"}</div>
                        <img onClick={this.deleteSite} className={'trash ' + this.state.inputsLocked} src='/images/icons/trash.svg' alt='delete site' />
                    </div>
                    
                </div>
            </div>
        );
    }
}

export default EditSite;