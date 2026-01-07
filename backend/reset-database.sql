-- ============================================
-- DATABASE RESET SCRIPT
-- ============================================
-- This script drops all existing tables and recreates them
-- with the updated webhook configuration.
--
-- WARNING: This will delete ALL data in your database!
-- Use this only for development/testing.
-- ============================================

-- Drop all tables (CASCADE removes dependencies)
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS candidates CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;
DROP TABLE IF EXISTS authorized_users CASCADE;

-- Now the schema.sql file will be used to recreate tables
-- Run schema.sql after this script to recreate all tables
