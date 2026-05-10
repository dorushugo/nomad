// Centralised route builders. Use these instead of inline string literals
// so a route rename only touches this file.
//
// Why builders and not just constants? expo-router's typed-routes feature
// doesn't fully cover dynamic segments yet, and templated paths are easy
// to typo. Functions force callers to pass the right arguments.

export const Routes = {
  home: () => "/(tabs)" as const,
  login: () => "/login" as const,
  register: () => "/register" as const,
  profile: () => "/(tabs)/profile" as const,

  createTrip: () => "/create-trip" as const,
  trip: (id: string) => `/trip/${id}` as const,

  // Add a scheduled item to a specific day
  addItemForDay: (dayId: string) => `/trip/add-item?dayId=${dayId}` as const,
  // Add an unplanned idea to a trip
  addIdeaForTrip: (tripId: string) => `/trip/add-item?tripId=${tripId}` as const,

  editItem: (itemId: string) => `/trip/edit-item?itemId=${itemId}` as const,
};
