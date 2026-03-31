import { tickerItems } from "../data/siteData";

export default function Ticker() {
  const doubled = [...tickerItems, ...tickerItems];
  return (
    <div className="ticker">
      <div className="ticker-track">
        {doubled.map((item, i) => (
          <div key={i} className="ticker-item">
            <span className="sep">◆</span>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
