# Neo-Radio
an electron app that plays music from youtube, and gives news via text-to-speech
- elevenlabs
- kokoro
- whatever I find that works well
and 
- RSS feeds (added by user)
- https://gnews.io/
- https://newsdata.io/
- https://newsapi.org/
- Open-Meteo (every ~2h)
- Time (every ~1h) 
all is orchestrated via LLM
Music recommendation from spotify, youtube and last.fm APIs
- user can like/dislike songs to improve recommendations
- user can add songs to a "favorites" playlist
- user can search for songs/artists/genres
- user can create custom playlists
- crossfading

Goal is to make radio for 21th century (imo radios are superior way of listening, but were killed by the hyperpersonalized recommendation engines of streaming services. I plan to bring the best of both worlds together)

## AI Pipeline
1st pass
- focus only on creating music playlist, ignoring news.
- prompt + yt/spotify playlists
- tools: yt/spotify search, last fm, youtube add
- LLM: glm4.7 from cerebras for speed
2nd pass
- focus only on news
- prompt + RSS feed
- tools: query news outlets
- LLM: glm4.7 from cerebras for speed
