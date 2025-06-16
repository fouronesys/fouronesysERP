import { storage } from "./storage";
import bcrypt from "bcrypt";

// Initialize admin user and system
export async function initializeAdminUser() {
  try {
    console.log("Updating contact information...");
    
    // Simply update existing company contact info if it exists
    try {
      const companies = await storage.getCompanies();
      const existingCompany = companies.find(c => 
        c.name.includes("Four One") || 
        c.name.includes("Test Company") ||
        c.name.includes("Solutions")
      );
      
      if (existingCompany) {
        await storage.updateCompany(existingCompany.id, {
          phone: "8293519324",
          email: "jesus@fourone.com"
        });
        console.log("Contact information updated successfully");
      }
    } catch (error) {
      console.log("No existing company found to update");
    }

    return true;
  } catch (error) {
    console.error("Error updating contact information:", error);
    // Don't throw error to avoid breaking startup
    return false;
  }
}