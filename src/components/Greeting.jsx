const Greeting = () => {
    const name = "John"
    const currentDate = new Date();

  return (
    <div>
        <h1>Good Morning { name }</h1>
        <p>The current date is { currentDate.getDate() }/{ currentDate.getMonth() }/{ currentDate.getFullYear() }</p>
    </div>
  )
}

export default Greeting