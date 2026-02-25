import { useEffect, useState } from "react";
import Search from "./Components/Search";
import Spinner from "./Components/Spinner"
const API_BASE_URL = 'https://api.themoviedb.org/3/';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
{ /* why do we always protect our API key */ }

const API_OPTIONS = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${API_KEY}`
  }
}

{ /* Do all APIs have this API_OPTIONS and do all APIs have this exact method? */ }

const App = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [movieList, setMovieList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMovies = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const endpoint = `${API_BASE_URL}/discover/movie?sort_by=popularity.desc`;    {/*why do we add an endpoint and not put everything in the base_url*/}

      const response = await fetch(endpoint, API_OPTIONS);

      console.log(response);

      if(!response.ok) {
        throw new Error('Failed to fetch Movies')
      }    {/* when using try and catch when fetching data from APIs, why do we still set a condition for throw new error  in the try part though there is a catch side to cacth an error */}

      const data = await response.json();

      if(data.Response === 'False') {
        setErrorMessage(data.Error || 'Failed to fetch movies');
        setMovieList([]);

        return;
      }

      setMovieList(data.results || []);
    } catch (error) {
      console.error(`Error fetching movies: ${error}`);
      {/* what is console.error? does it display on your screeen or console? */}

      setErrorMessage('Error fetching movies. Please try again later.');
    } finally {
      setIsLoading(false);
    }

  }

  useEffect( () => {
    fetchMovies();
  }, []);

  return (
    <div className="pattern">
      <div className="wrapper">
        <header>
          <img src="./hero.png" alt="Hero Banner" />
          <h1>Find <span className="text-gradient">Movies</span> You'll enjoy Without the Hassle</h1>

          <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </header>
        {/* why is the setFunction = to the setFunction and the searchTerm prop equal to itself? */}

        <section className="all-movies">
          <h2 className="mt-[40px]">All movies</h2>

          {isLoading ? (
            <Spinner />
          ) : errorMessage ? (
            <p className="text-red-500">{errorMessage}</p>
          ) : (
            <ul>
              {movieList.map((movie) => (
                <p key={movie.id} className="text-white">{movie.title}</p>
              ))}
            </ul>
          )
        }
        </section>
      </div>

    </div>
    
  );
}

export default App;