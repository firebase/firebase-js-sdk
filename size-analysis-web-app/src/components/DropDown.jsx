import React from 'react';


function DropDown(props) {
    return (

        <div className="container m-2">
            <select className="form-control" name={props.name} value={props.value} onChange={props.onChange}>
                {props.listItems.map((value, key) =>
                    <option key={key} value={value}>{value}</option>
                )}
            </select>

        </div>


    );
}


export default DropDown;