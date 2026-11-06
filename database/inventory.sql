-- ====================================================================
-- Inventory Management System - Database Setup Script
-- Database Name: inventory_management
-- File Path: database/inventory.sql
-- ====================================================================

-- 1. Create Database if it does not exist
CREATE DATABASE IF NOT EXISTS inventory_management;
USE inventory_management;

-- 2. Drop existing tables if they exist (in child-to-parent order)
DROP TABLE IF EXISTS Products;
DROP TABLE IF EXISTS Categories;
DROP TABLE IF EXISTS Suppliers;

-- --------------------------------------------------------------------
-- Table 1: Categories
-- Primary Key: category_id
-- --------------------------------------------------------------------
CREATE TABLE Categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- Table 2: Suppliers
-- Primary Key: supplier_id
-- --------------------------------------------------------------------
CREATE TABLE Suppliers (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- Table 3: Products
-- Primary Key: product_id
-- Foreign Keys: category_id -> Categories(category_id)
--               supplier_id -> Suppliers(supplier_id)
-- --------------------------------------------------------------------
CREATE TABLE Products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    category_id INT NULL,
    supplier_id INT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    quantity INT NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) 
        REFERENCES Categories(category_id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
    CONSTRAINT fk_products_supplier
        FOREIGN KEY (supplier_id) 
        REFERENCES Suppliers(supplier_id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes for performance
CREATE INDEX idx_products_category ON Products(category_id);
CREATE INDEX idx_products_supplier ON Products(supplier_id);
CREATE INDEX idx_products_quantity ON Products(quantity);
CREATE INDEX idx_products_name ON Products(product_name);

-- --------------------------------------------------------------------
-- Sample Records: Categories
-- --------------------------------------------------------------------
INSERT INTO Categories (category_id, category_name, description) VALUES
(1, 'Electronics & Gadgets', 'Devices, computers, accessories, smart home tech, and peripherals.'),
(2, 'Office Supplies', 'Desk organization, stationery, paper products, and writing essentials.'),
(3, 'Furniture & Ergonomics', 'Office desks, ergonomic chairs, storage cabinets, and workstations.'),
(4, 'Networking & Storage', 'Routers, cables, switches, hard drives, and network infrastructure.'),
(5, 'Industrial & Tools', 'Maintenance equipment, hand tools, measurement devices, and hardware.');

-- --------------------------------------------------------------------
-- Sample Records: Suppliers
-- --------------------------------------------------------------------
INSERT INTO Suppliers (supplier_id, supplier_name, email, phone, address) VALUES
(1, 'Apex Tech Distribution', 'orders@apextech.com', '+1 (555) 234-5678', '100 Silicon Blvd, Suite 400, San Jose, CA 95134'),
(2, 'Global Office Solutions', 'support@globaloffice.com', '+1 (555) 876-5432', '450 Industrial Parkway, Chicago, IL 60607'),
(3, 'ErgoComfort Interiors', 'sales@ergocomfort.com', '+1 (555) 345-6789', '88 Design Avenue, Grand Rapids, MI 49503'),
(4, 'Nexus Network Systems', 'contact@nexusnetsys.com', '+1 (555) 987-6543', '720 Telecom Way, Austin, TX 78701'),
(5, 'ProTool Supplies Co.', 'info@protoolsupply.com', '+1 (555) 432-1098', '310 Hardware Drive, Cleveland, OH 44114');

-- --------------------------------------------------------------------
-- Sample Records: Products
-- (Includes healthy stock, low stock, and out of stock records)
-- --------------------------------------------------------------------
INSERT INTO Products (product_name, category_id, supplier_id, price, quantity, description) VALUES
('UltraWide Gaming Monitor 34"', 1, 1, 499.99, 18, 'Curved 144Hz WQHD monitor with HDR and USB-C connectivity.'),
('Wireless Ergonomic Keyboard', 1, 1, 89.99, 4, 'Split ergonomic design with cushioned wrist rest and Bluetooth pairing.'),
('Precision Optical Mouse', 1, 1, 39.50, 45, 'Rechargeable optical mouse with adjustable DPI and silent clicks.'),
('Noise-Cancelling USB Headset', 1, 1, 129.00, 2, 'Professional stereo headset with boom microphone for communications.'),
('Executive Mesh Task Chair', 3, 3, 249.99, 12, 'High-back ergonomic mesh chair with adjustable lumbar support.'),
('Motorized Standing Desk 60x30', 3, 3, 399.00, 7, 'Dual-motor height adjustable sit-stand desk with memory presets.'),
('Under-Desk Filing Cabinet 3-Drawer', 3, 3, 119.50, 0, 'Heavy-duty steel mobile file cabinet with anti-tip lock mechanism.'),
('Gigabit 16-Port Managed Switch', 4, 4, 189.00, 15, 'Rackmount network switch with VLAN support and energy-efficient Ethernet.'),
('Cat6 Shielded Ethernet Cable 50ft', 4, 4, 19.99, 85, 'High-performance stranded twisted pair patch cable for gigabit LAN.'),
('External NVMe SSD 2TB', 4, 4, 159.99, 3, 'Rugged high-speed USB 3.2 Gen2 portable solid-state drive.'),
('Heavy-Duty Shipping Tape (6-Pack)', 2, 2, 24.99, 60, 'Commercial grade acrylic packaging tape for carton sealing.'),
('Recycled Copy Paper (10 Reams)', 2, 2, 54.00, 25, 'Standard letter size 8.5 x 11 inches 20 lb multipurpose bright white paper.'),
('Gel Ink Retractable Pens (Pack of 12)', 2, 2, 14.50, 110, 'Smooth-flowing quick-dry black gel pens with comfort grip.'),
('Digital Laser Distance Measurer', 5, 5, 49.99, 8, 'Handheld 165-foot laser rangefinder with backlit LCD and area calculation.'),
('Precision Screwdriver Set 64-in-1', 5, 5, 29.95, 0, 'Magnetic bit driver kit for electronics, laptop, and smartphone repairs.');
