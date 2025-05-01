import SpecialSection from "../model/Speciality.js";

// Create a special section
export const createSpecialSection = async (req, res) => {
  try {
    const { title, description, trips } = req.body;
    const newSection = await SpecialSection.create({ title, description, trips });
    res.status(201).json(newSection);
  } catch (error) {
    res.status(500).json({ message: "Failed to create special section", error });
  }
};

// Get all special sections
export const getAllSpecialSections = async (req, res) => {
  try {
    const sections = await SpecialSection.find().populate("trips");
    res.status(200).json(sections);
  } catch (error) {
    res.status(500).json({ message: "Failed to get special sections", error });
  }
};

// Get single section by ID
export const getSpecialSectionById = async (req, res) => {
  try {
    const section = await SpecialSection.findById(req.params.id).populate("trips");
    if (!section) return res.status(404).json({ message: "Section not found" });
    res.status(200).json(section);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch section", error });
  }
};

// Update special section
export const updateSpecialSection = async (req, res) => {
  try {
    const { title, description, trips } = req.body;
    console.log(title, description, trips)
    const updatedSection = await SpecialSection.findByIdAndUpdate(
      req.params.id,
      { title, description, trips },
      { new: true }
    );
    if (!updatedSection) return res.status(404).json({ message: "Section not found" });
    res.status(200).json(updatedSection);
  } catch (error) {
    res.status(500).json({ message: "Failed to update section", error });
  }
};

// Delete special section
export const deleteSpecialSection = async (req, res) => {
  try {
    const deleted = await SpecialSection.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Section not found" });
    res.status(200).json({ message: "Section deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete section", error });
  }
};
