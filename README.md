# Setup
Have miniconda and node installed

- Create conda environment
```
conda create -n aqi python=3.12.12
```

- Install dependenices
```
npm i
```

- Activate environment
```
conda activate aqi
```

- Install server dependencies
```
cd server
pip install -r requirements.txt
```

- Create .env file in `server/`
```
touch .env
```

- Get [OpenWeather API Key](https://openweathermap.org/) and paste in .env
```.env
OPENWEATHER_API_KEY=<your-key-here>
```

- Run the servers
```
npm run dev
```

```
cd server
fastapi dev
```
