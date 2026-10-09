import React from 'react';

export default function Alert(props) {


    return (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
            {props.errorMessage}
            <button type="button" className="close" data-dismiss="alert" aria-label="Close"
                onClick={props.clearErrorMessage}
            >
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
    );
}