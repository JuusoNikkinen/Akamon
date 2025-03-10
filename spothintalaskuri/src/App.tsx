import { useState, useEffect } from 'react';
import './App.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

//Muunna hinta EUR/MWh -> snt/kWh (ja pyöristä 2 desimaalin tarkkuudella)
const MuunnaHintaSntKwh = ({ hinta }: { hinta: number }) => {
  const convertedPrice = Math.round((hinta / 10) * 100) / 100;
  return <span>{convertedPrice} snt/kWh</span>;
};

//Muunna timestamp -> tunniksi (ja minuuteiksi)
const MuunnaTimestamp = ({ timestamp }: { timestamp: string }) => {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

//Lisää hintaan arvonlisävero 25.5%
const AlvHinta = (hinnat: { timestamp: string; price: number }[]) => {
  if (!hinnat || !Array.isArray(hinnat)) {
    return [];
  }
  const sahkonAlv = 25.5;
  return hinnat.map(item => ({
    ...item,
    price: item.price * (1 + sahkonAlv / 100),
  }));
};

//Laske halvin spothinta ja näytä hinta snt/kWh
const Halvintunti = ({ hinnat }: { hinnat: { hinnat: { timestamp: string; price: number }[] } }) => {
  if (!hinnat || !Array.isArray(hinnat.hinnat) || hinnat.hinnat.length === 0) {
    return <div className="halvintunti">Halvin tunti: Ei dataa</div>;
  }

  const halvin = hinnat.hinnat.reduce((prev, current) => (prev.price < current.price ? prev : current));
  return (
    <div className="halvintunti">
      <h2>Halvin tunti <MuunnaTimestamp timestamp={halvin.timestamp} /> </h2>
      <p><MuunnaHintaSntKwh hinta={halvin.price} /></p>
    </div>
  );
};

//Laske kallein spothinta ja näytä hinta snt/kWh
const Kalleintunti = ({ hinnat }: { hinnat: { hinnat: { timestamp: string; price: number }[] } }) => {
  if (!hinnat || !Array.isArray(hinnat.hinnat) || hinnat.hinnat.length === 0) {
    return <div className="kalleintunti">Kallein tunti: Ei dataa</div>;
  }

  const kallein = hinnat.hinnat.reduce((prev, current) => (prev.price > current.price ? prev : current));
  return (
    <div className="kalleintunti">
      <h2>Kallein tunti <MuunnaTimestamp timestamp={kallein.timestamp} /> </h2>
      <p><MuunnaHintaSntKwh hinta={kallein.price} /></p>
    </div>
  );
};

//Laske keskiarvo spothinta ja näytä hinta snt/kWh
const Keskiarvo = ({ hinnat }: { hinnat: { hinnat: { timestamp: string; price: number }[] } }) => {
  if (!hinnat || !Array.isArray(hinnat.hinnat) || hinnat.hinnat.length === 0) {
    return <div className="keskiarvo">Keskiarvo: Ei dataa</div>;
  }

  const total = hinnat.hinnat.reduce((prev, current) => prev + current.price, 0);
  const keskiarvo = total / hinnat.hinnat.length;
  return (
    <div className="keskiarvo">
      <h2>Keskiarvo</h2>
      <p><MuunnaHintaSntKwh hinta={keskiarvo} /></p>
    </div>
  );
};

//Piirrä taulukko
const PiirraTaulukko = ({ hinnat }: { hinnat: { timestamp: string; price: number }[] }) => {
  if (!hinnat || hinnat.length === 0) return <div>Ei dataa</div>;

  const chartData = hinnat.map(item => ({
    name: new Date(item.timestamp).getUTCHours().toString().padStart(2, '0') + ':00',
    value: Math.round((item.price / 10) * 100) / 100,
  }));

  const yAxisTicks = [];
  const minValue = Math.floor(Math.min(...chartData.map(item => item.value)) / 5) * 5;
  const maxValue = Math.ceil(Math.max(...chartData.map(item => item.value)) / 5) * 5;

  for (let i = minValue; i <= maxValue; i += 5) {
    yAxisTicks.push(i);
  }

  const formatXAxis = (tickItem: string) => {
    if (window.innerWidth <= 800) {
      return tickItem.split(':')[0];
    }
    return tickItem;
  };

  return (
    <div className="App-barchart">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="0" stroke="#e5e5e5" />
          <XAxis dataKey="name" interval={0} tickFormatter={formatXAxis} />
          <YAxis ticks={yAxisTicks} interval={0} />
          <Tooltip />
          <Bar dataKey="value" fill="#ff8aa350" stroke="#ff8aa3" barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

//Hae data spot-data.json tiedostosta
async function fetchSpotData(jsonUrl: string) {
  try {
    const response = await fetch(jsonUrl);
    if (!response.ok) {
      throw new Error(`fetchSpotData error: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new TypeError("fetchSpotData error: Response is not JSON");
    }

    const data = await response.json();
    return data.map((item: { timestamp: string; price: number }) => ({
      timestamp: item.timestamp,
      price: item.price,
    }));
  } catch (error) {
    console.error('fetchSpotData error: ', error);
    return [];
  }
}

//Pääkomponentti
function App() {
  const jsonUrl = '/src/spot-data.json';
  const [aikaHinta, setAikaHinta] = useState<{ timestamp: string; price: number }[]>([]);
  const [aikaHintaAlv, setAikaHintaAlv] = useState<{ timestamp: string; price: number }[]>([]);

  useEffect(() => {
    fetchSpotData(jsonUrl).then((data) => {
      if (data.length > 0) {
        setAikaHinta(data);
        setAikaHintaAlv(AlvHinta(data));
      } else {
        console.error('No data fetched');
      }
    }).catch((error) => {
      console.error('Error fetching data:', error);
    });
  }, []);

  return (
    <div className="App-container">
      <div className="App-header">Akamon - spothinta ohjelmointitehtävä</div>
      <Halvintunti hinnat={{ hinnat: aikaHintaAlv }} />
      <Kalleintunti hinnat={{ hinnat: aikaHintaAlv }} />
      <Keskiarvo hinnat={{ hinnat: aikaHintaAlv }} />
      <div className="App-barchart-legend">
        <div className="App-barchart-legend-box"></div>Hinnat snt/kWh
      </div>
      <PiirraTaulukko hinnat={aikaHintaAlv} />
    </div>
  );
}

export default App;