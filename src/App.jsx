import UserList from "./components/UserList";
import ProductList from "./components/ProductList";

const App = () => {
  const list = [1,2,3,4,5];

  return (
    <div>
      {
        list.map((number) => (
          <ul key={number}>
            <li>{number}</li>
          </ul>
        ))
      }

      <UserList />
      <ProductList />
    </div>
  )
}

export default App