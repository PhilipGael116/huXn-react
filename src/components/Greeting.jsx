const Greeting = ({ timeOfDay }) => {
  return (
    <div>
        {
            timeOfDay === "morning"? <p>Good morning</p>: null
        }
        {
            timeOfDay === "afternoon"? <p>Good afternoon</p>: null
        }
    </div>
  )
}

export default Greeting