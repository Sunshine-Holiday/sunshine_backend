import PickupLocation from "../model/PickupLocation.js";

export const createPickupLocation = async (req, res) => {
  try {
    const { name, maplink = "", details = "" } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Pickup location name is required",
      });
    }

    const trimmedName = String(name).trim();
    const all = await PickupLocation.find().select("name");
    const existing = all.find(
      (l) => l.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "A pickup location with this name already exists",
      });
    }

    const location = await PickupLocation.create({
      name: trimmedName,
      maplink: String(maplink || "").trim(),
      details: String(details || "").trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Pickup location created successfully",
      location,
    });
  } catch (error) {
    console.error("createPickupLocation:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A pickup location with this name already exists",
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create pickup location",
    });
  }
};

export const getAllPickupLocations = async (_req, res) => {
  try {
    const locations = await PickupLocation.find().sort({ name: 1 });
    return res.status(200).json({
      success: true,
      locations,
      count: locations.length,
    });
  } catch (error) {
    console.error("getAllPickupLocations:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch pickup locations",
    });
  }
};

export const getPickupLocationById = async (req, res) => {
  try {
    const location = await PickupLocation.findById(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Pickup location not found",
      });
    }
    return res.status(200).json({ success: true, location });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch pickup location",
    });
  }
};

export const updatePickupLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, maplink, details } = req.body;

    const location = await PickupLocation.findById(id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Pickup location not found",
      });
    }

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        return res.status(400).json({
          success: false,
          message: "Pickup location name cannot be empty",
        });
      }
      const others = await PickupLocation.find({ _id: { $ne: id } }).select("name");
      const duplicate = others.find(
        (l) => l.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "Another pickup location already uses this name",
        });
      }
      location.name = trimmed;
    }

    if (maplink !== undefined) location.maplink = String(maplink || "").trim();
    if (details !== undefined) location.details = String(details || "").trim();

    await location.save();

    return res.status(200).json({
      success: true,
      message: "Pickup location updated successfully",
      location,
    });
  } catch (error) {
    console.error("updatePickupLocation:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update pickup location",
    });
  }
};

export const deletePickupLocation = async (req, res) => {
  try {
    const location = await PickupLocation.findByIdAndDelete(req.params.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Pickup location not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Pickup location deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete pickup location",
    });
  }
};
