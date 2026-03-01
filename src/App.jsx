import { useState } from 'react'


const App = () => {

  const [isActive, setIsActive] = useState(false);

  const sideToggle = () => {
    setIsActive(prevState => !prevState);
  }

  return (
    <div>
      <button onClick={sideToggle} className={`${isActive ? "hidden" : "block"} `}>🍔</button>
      <button onClick={sideToggle} className={`${isActive ? "block" : "hidden"} `}>❌</button>
      <div className={`transition-all ${isActive ? "block" : "hidden"}`}>
        <p>🏠</p>
        <p>🏠</p>
        <p>🏠</p>
        <p>🏠</p>
      </div>
    </div>
  )
}

export default App;