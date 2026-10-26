import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page">
      <header className="thead"><span className="label">Eroare 404</span><h1 className="ttitle">Pagină inexistentă</h1></header>
      <p className="note">Linkul e greșit sau pagina a fost mutată.</p>
      <div className="actions" style={{ marginTop: 20 }}><Link className="btn solid" to="/">Înapoi la început</Link></div>
    </div>
  );
}
