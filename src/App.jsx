import React from 'react'
import { useState } from 'react';

const App = () => {

  const [count, setCount] = useState(0);

  const increment = () => setCount(count +1);
  const decrement = () => setCount(count - 1);

  // Friends part

  const [friends, setFriends] = useState(["Alex", "John", "Philippe"]);

  const addFriend = () => {
    setFriends([...friends, "Philippe"]);
  }

  const removeFriend = () => {
    setFriends(friends.filter((friend) => (
      friend !== "John"
    )))
  }

  const updateOneFriend = () => {
    setFriends(friends.map((friend) => (
      friend === "Alex"? "Alex Smith" : friend
    )))
  }


  // Movie Part
  const [ movie, setMovie ] = useState({
    title: "Fast 9",
    rating: 5,
  })

  const changeRating = () => {
    setMovie({...movie, rating: 10});
  }


  // Array of objects

  const [ movies, setMovies ] = useState([
    {id: 1, title: "Full metal", rating: 2},
    {id: 2, title: "Invincible", rating: 4},
  ])

  const handleClick = () => {
    setMovies(movies.map((m) => (
      m.id === 1? {...m, rating: 10} : m
    )))
  }

  return (
    <div>
      <p>{count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>

      {/* Friends part */}

      {
        friends.map((friend) => (
          <ul key={Math.random()}>
            <li>{friend}</li>
          </ul>
        ))
      }

      <button onClick={addFriend}>Add New Friend</button>
      <button onClick={removeFriend}>Remove Friend</button>
      <button onClick={updateOneFriend}>update Friend</button>


      {/* Movies Part */}
      <p>{movie.title}</p>
      <p>Rating: {movie.rating}</p>

      <button onClick={changeRating}>Change rating</button>


      {/* Array of objects */}

      {
        movies.map(({ id, title, rating }) => (
          <p key={id}>{title} {rating}</p>
        ))
      }
      <button onClick={handleClick}>Rate</button>
    </div>
  )
}

export default App