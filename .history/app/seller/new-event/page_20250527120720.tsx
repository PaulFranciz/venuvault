import EventForm from "@/components/EventForm";

export default function NewEventPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-brand-teal to-teal-700 px-6 py-8 text-white">
          <h2 className="text-2xl font-pally-bold">Create New Event</h2>
          <p className="text-teal-100 mt-2">
            Set up your event details, ticket types, pricing, and more
          </p>
        </div>

        <div className="p-6">
          <EventForm mode="create" />
        </div>
      </div>
    </div>
  );
}
