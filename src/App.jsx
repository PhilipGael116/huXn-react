import Product from './components/Product'
import Person from './components/Person'
import Card from './components/Card'

const App = () => {
  return (
    <div>
      <Person name="Philippe" age={19} />
      <Product name="iPhone 11PM" price={15000} />

      <Card>
        <h1>This is the  card component with some data</h1>
        <p>Some random text in it</p>
      </Card>

    </div>
  )
}

export default App