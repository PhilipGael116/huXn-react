import React from 'react'

const ComponentOne = ({ count, onClickHandler }) => {
    
    const handleClick = () => onClickHandler();
    

  return (
    <div>
        <p>{count}</p>
        <button onClick={handleClick}>increment</button>
    </div>
  )
}

export default ComponentOne