import React from 'react'

const UserList = () => {
    const users = [
        { id: 1, name: "alice", age: 25 },
        { id: 2, name: "Bob", age: 38 },
        { id: 3, name: "charlie", age: 22 },
    ]

  return (
    <div>
        {
            users.map(({ id, name, age }) => (
                <div key={id}>
                    <p>{name}, {age}</p>
                </div>
            ))
        }
    </div>
  )
}

export default UserList