import React from 'react'

const Button = () => {
  const handleClick = () =>
   console.log(Math.round((Math.random() * 10)))
  

  return <button onClick={handleClick}>Click</button>
};

const Copy = () => {
  const handleCopy = () => {
    console.log("Do not try to copy content on this webpage")
  }

  return <p onCopy={handleCopy}>Lorem ipsum dolor sit amet consectetur adipisicing elit. Doloribus beatae sequi voluptates ab sunt recusandae sit minima nulla facilis at.</p>
}

const App = () => {
  return (
    <div>
      <Button />
      <Copy />
    </div>
  )
}

export default App