import React from 'react'

const ComponentTwo = ({ count, onClickHandler }) => {
  return (
    <div>
        <p>{count}</p>
        <button onClick={() => onClickHandler()}>increment</button>
    </div>
  )
}

export default ComponentTwo