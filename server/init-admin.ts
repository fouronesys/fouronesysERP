import { storage } from "./storage";
import bcrypt from "bcrypt";

// Initialize admin user and system
export async function initializeAdminUser() {
  try {
    console.log("Initializing super admin user and company...");
    
    // Check if admin user already exists
    try {
      const existingAdmin = await storage.getUserByEmail("admin@fourone.com.do");
      if (existingAdmin) {
        console.log("Super admin user already exists");
        return true;
      }
    } catch (error) {
      console.log("No existing admin found, creating new one...");
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash("PSzorro99**", 10);

    // Create super admin user first
    const adminUserId = `admin-${Date.now()}`;
    const adminData = {
      id: adminUserId,
      email: "admin@fourone.com.do",
      password: hashedPassword,
      firstName: "Super",
      lastName: "Admin",
      role: "super_admin",
      isActive: true,
      phoneNumber: "8293519324"
    };

    const adminUser = await storage.createUser(adminData);
    console.log("Created super admin user:", adminUser.email);

    // Create the company with the admin as owner
    const companyData = {
      name: "Four One Solutions",
      rnc: "132123456",
      address: "Av. Winston Churchill, Santo Domingo",
      phone: "8293519324",
      email: "jesus@fourone.com",
      website: "https://fourone.com.do",
      ownerId: adminUser.id
    };

    const company = await storage.createCompany(companyData);
    console.log("Created main company:", company.name);

    // Create company-user relationship
    await storage.createCompanyUser({
      userId: adminUser.id,
      companyId: company.id,
      role: "company_admin",
      isActive: true
    });

    // Create sample products with correct types
    const sampleProducts = [
      {
        code: "PROD001",
        name: "Laptop Dell Inspiron 15",
        description: "Laptop Dell Inspiron 15 3000, Intel Core i5, 8GB RAM, 256GB SSD",
        price: "45000.00",
        cost: "35000.00",
        stock: 25,
        minStock: 5,
        maxStock: 100,
        unit: "unidad",
        isActive: true,
        companyId: company.id
      },
      {
        code: "PROD002", 
        name: "Mouse Inalámbrico Logitech",
        description: "Mouse inalámbrico Logitech M705, ergonómico, batería de larga duración",
        price: "2500.00",
        cost: "1800.00",
        stock: 50,
        minStock: 10,
        maxStock: 200,
        unit: "unidad",
        isActive: true,
        companyId: company.id
      },
      {
        code: "SERV001",
        name: "Consultoría TI - Hora",
        description: "Servicio de consultoría en tecnologías de información por hora",
        price: "3000.00",
        cost: "0.00",
        stock: 0,
        minStock: 0,
        maxStock: 0,
        unit: "hora",
        isActive: true,
        companyId: company.id
      }
    ];

    for (const product of sampleProducts) {
      try {
        await storage.createProduct(product);
      } catch (error) {
        console.log("Error creating product:", product.name, error);
      }
    }
    console.log("Created sample products");

    // Create sample customers with correct types
    const sampleCustomers = [
      {
        name: "Juan Pérez",
        email: "juan.perez@email.com",
        phone: "8093456789",
        address: "Calle Primera #123, Santo Domingo",
        rnc: "12345678901",
        type: "individual" as const,
        companyId: company.id
      },
      {
        name: "Empresa ABC S.R.L.",
        email: "info@empresaabc.com.do",
        phone: "8095551234",
        address: "Av. 27 de Febrero #456, Santo Domingo",
        rnc: "10123456789",
        type: "company" as const,
        companyId: company.id
      }
    ];

    for (const customer of sampleCustomers) {
      try {
        await storage.createCustomer(customer);
      } catch (error) {
        console.log("Error creating customer:", customer.name, error);
      }
    }
    console.log("Created sample customers");

    console.log("Super admin initialization completed successfully");
    return true;
  } catch (error) {
    console.error("Error initializing super admin:", error);
    return false;
  }
}