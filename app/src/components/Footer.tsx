export default function Footer() {
  return (
    <footer className="bg-saguaro-950 text-saguaro-300 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-2">The Saguaros</h3>
            <p className="text-sm leading-relaxed">
              A philanthropic organization of young professionals raising funds
              for children&apos;s charities across Arizona since 1987.
            </p>
          </div>
          <div>
            <h3 className="text-white font-bold text-lg mb-2">Quick Links</h3>
            <ul className="space-y-1.5 text-sm">
              <li><a href="https://www.saguaros.com" className="hover:text-white transition-colors">saguaros.com</a></li>
              <li><a href="https://www.saguaros.com/olympiad" className="hover:text-white transition-colors">Olympiad Info</a></li>
              <li><a href="https://www.saguaros.com/about" className="hover:text-white transition-colors">About The Saguaros</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-bold text-lg mb-2">Contact</h3>
            <ul className="space-y-1.5 text-sm">
              <li>
                <a href="mailto:olympiad@saguaros.com" className="hover:text-white transition-colors">
                  olympiad@saguaros.com
                </a>
              </li>
              <li>Scottsdale, AZ</li>
            </ul>
            <p className="text-xs text-saguaro-500 mt-4">
              The Saguaros Foundation is a 501(c)(3) Qualified Charitable Organization.
            </p>
          </div>
        </div>
        <div className="border-t border-saguaro-800 mt-8 pt-8 text-center text-sm text-saguaro-500">
          &copy; {new Date().getFullYear()} The Scottsdale Saguaros. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
