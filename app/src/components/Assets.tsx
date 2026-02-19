import { marketingAssets } from "@/data/mock";

const categoryColors: Record<string, string> = {
  Logos: "bg-purple-100 text-purple-700",
  Brand: "bg-blue-100 text-blue-700",
  Social: "bg-pink-100 text-pink-700",
  Email: "bg-gold-100 text-gold-700",
  Print: "bg-saguaro-100 text-saguaro-700",
};

export default function Assets() {
  return (
    <section id="assets" className="py-20 bg-white scroll-mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Marketing Assets
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Ready-to-use materials for promoting your team, reaching out to sponsors,
            and driving donations. Download and customize.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {marketingAssets.map((asset, index) => (
            <div
              key={index}
              className="group relative bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-saguaro-300 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${categoryColors[asset.category] || "bg-gray-100 text-gray-700"}`}>
                  {asset.category}
                </span>
                <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">
                  {asset.fileType}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{asset.name}</h3>
              <p className="text-sm text-gray-500">{asset.description}</p>
              <div className="mt-4 flex items-center text-sm font-medium text-saguaro-600 group-hover:text-saguaro-700">
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Need a custom asset or have a specific request? Contact{" "}
            <a href="mailto:marketing@saguaros.com" className="text-saguaro-600 hover:underline">
              marketing@saguaros.com
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
