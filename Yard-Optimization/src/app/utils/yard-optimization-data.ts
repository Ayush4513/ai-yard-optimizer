// ============================================================================
// COLOR PALETTES (used for UI styling — no DB equivalent)
// ============================================================================

export const colorPalettes = {
  shipping_line: {
    Maersk: "bg-blue-500 border-blue-600",
    MSC: "bg-yellow-500 border-yellow-600",
    "CMA CGM": "bg-red-500 border-red-600",
    COSCO: "bg-green-500 border-green-600",
    "Hapag-Lloyd": "bg-cyan-500 border-cyan-600",
    ONE: "bg-pink-500 border-pink-600",
    default: "bg-green-600 border-green-700",
  },
  pod: {
    Colombo: "bg-teal-500 border-teal-600",
    Singapore: "bg-indigo-500 border-indigo-600",
    Dubai: "bg-amber-500 border-amber-600",
    Rotterdam: "bg-cyan-500 border-cyan-600",
    Shanghai: "bg-rose-500 border-rose-600",
    Kochi: "bg-orange-500 border-orange-600",
    JNPT: "bg-purple-500 border-purple-600",
    Mundra: "bg-lime-500 border-lime-600",
    default: "bg-green-600 border-green-700",
  },
  movement_type: {
    export_container: "bg-blue-500 border-blue-600",
    import_container: "bg-green-500 border-green-600",
    empty: "bg-gray-500 border-gray-600",
  },
  consignee: {
    "ABC Corp": "bg-violet-500 border-violet-600",
    "XYZ Ltd": "bg-fuchsia-500 border-fuchsia-600",
    "Global Trade Inc": "bg-pink-500 border-pink-600",
    "Ocean Freight Co": "bg-emerald-500 border-emerald-600",
    "Logistics Plus": "bg-lime-500 border-lime-600",
    default: "bg-green-600 border-green-700",
  },
  block_types: {
    General: "bg-green-50 border-green-200",
    Reefer: "bg-blue-100 border-blue-300",
    Hazmat: "bg-red-100 border-red-300",
    Empty: "bg-yellow-100 border-yellow-300",
    OOG: "bg-gray-100 border-gray-300",
  },
};
