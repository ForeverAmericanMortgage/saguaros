import { timelineEvents } from "@/data/mock";

const typeStyles = {
  deadline: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  event: { bg: "bg-saguaro-100", text: "text-saguaro-700", dot: "bg-saguaro-500" },
  milestone: { bg: "bg-gold-100", text: "text-gold-700", dot: "bg-gold-500" },
};

export default function Timeline() {
  return (
    <section id="timeline" className="py-20 bg-white scroll-mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Critical Dates
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Key milestones from registration through Olympiad day. Bookmark this page
            and check back throughout the season.
          </p>
        </div>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 transform sm:-translate-x-0.5" />

          <div className="space-y-8">
            {timelineEvents.map((event, index) => {
              const styles = typeStyles[event.type];
              const isLeft = index % 2 === 0;

              return (
                <div key={index} className="relative flex items-start">
                  {/* Mobile layout (always left-aligned) */}
                  <div className="sm:hidden flex items-start gap-4 ml-0">
                    <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full ${styles.dot} flex items-center justify-center`}>
                      <div className="w-3 h-3 rounded-full bg-white" />
                    </div>
                    <div className={`flex-1 rounded-lg p-4 ${styles.bg}`}>
                      <span className={`text-xs font-bold uppercase tracking-wider ${styles.text}`}>
                        {event.date}
                      </span>
                      <h3 className="font-semibold text-gray-900 mt-1">{event.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                    </div>
                  </div>

                  {/* Desktop layout (alternating) */}
                  <div className="hidden sm:flex items-center w-full">
                    <div className={`w-1/2 ${isLeft ? "pr-8 text-right" : "pl-8 text-left order-2"}`}>
                      <div className={`inline-block rounded-lg p-4 ${styles.bg} ${isLeft ? "ml-auto" : "mr-auto"}`}>
                        <span className={`text-xs font-bold uppercase tracking-wider ${styles.text}`}>
                          {event.date}
                        </span>
                        <h3 className="font-semibold text-gray-900 mt-1">{event.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      </div>
                    </div>
                    <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full ${styles.dot} flex items-center justify-center ${isLeft ? "" : "order-1"}`}>
                      <div className="w-3 h-3 rounded-full bg-white" />
                    </div>
                    <div className={`w-1/2 ${isLeft ? "order-2" : ""}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center gap-6 mt-10 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-600">Deadline</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-saguaro-500" />
            <span className="text-gray-600">Event</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gold-500" />
            <span className="text-gray-600">Milestone</span>
          </div>
        </div>
      </div>
    </section>
  );
}
