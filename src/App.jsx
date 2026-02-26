import Weather from "./components/Weather"
import UserStatus from "./components/UserStatus"
import Greeting from "./components/Greeting"

const ValidPassword = () => <h1>Valid Password</h1>

const InvalidPassword = () => <h1>Invalid Password</h1>


const Password = ({ isValid }) => 
 isValid ? <ValidPassword /> : <InvalidPassword />

const App = () => {
  const items = ["Wireless Earbuds", "New SSD", "Hoodie"];

  console.log(items);

  return (
    <div>
      <h1>Cart 🛒</h1>
      {items.length > 0 && <h2>You have {items.length} items in your cart</h2> }

      {items.map((item) => (
        <li key={Math.random()}>{item}</li>
      ))}

      <Password isValid={false} />
      <Weather temperaature={45} />
      <UserStatus loggedIn={true} isAdmin={true}/>
      <Greeting timeOfDay="morning" />
    </div>
  )
}

export default App