#!/usr/bin/env python3
"""
Backend API Testing for Shyntr IAM System - Iteration 2
Tests all CRUD operations for OIDC clients, SAML clients, SAML connections, OIDC connections, and Tenants.
"""
import requests
import sys
import json
from datetime import datetime
from typing import Dict, List, Any

class ShyntrAPITester:
    def __init__(self, base_url="https://iam-frontend.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = {
            'oidc_clients': [],
            'saml_clients': [],
            'saml_connections': [],
            'oidc_connections': [],
            'tenants': []
        }

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, data: Dict = None) -> tuple[bool, Any]:
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            response = None
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    return success, response_data
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response text: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Network Error: {str(e)}")
            return False, {}

    # Dashboard Tests
    def test_dashboard_stats(self) -> bool:
        """Test dashboard statistics endpoint"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        if success:
            required_fields = ['total_oidc_clients', 'total_saml_clients', 'total_saml_connections', 
                             'total_oidc_connections', 'total_tenants', 'public_clients', 'confidential_clients', 'recent_activity']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing field: {field}")
                    return False
            print(f"   Stats: {response['total_oidc_clients']} OIDC clients, {response['total_saml_clients']} SAML clients, {response['total_saml_connections']} SAML connections, {response['total_oidc_connections']} OIDC connections, {response['total_tenants']} tenants")
        return success

    # OIDC Client Tests (Applications)
    def test_oidc_clients(self) -> bool:
        """Test complete OIDC client CRUD operations"""
        print("\n=== OIDC CLIENT TESTS ===")
        
        # 1. List OIDC clients (should be empty initially or return existing)
        success, clients = self.run_test("List OIDC Clients", "GET", "clients", 200)
        if not success:
            return False

        # 2. Create an OIDC client
        client_data = {
            "client_id": f"test-oidc-client-{datetime.now().strftime('%H%M%S')}",
            "name": "Test OIDC Application",
            "tenant_id": "default",
            "redirect_uris": ["https://app.example.com/callback"],
            "allowed_cors_origins": ["https://app.example.com"],
            "grant_types": ["authorization_code", "refresh_token"],
            "response_types": ["code"],
            "scopes": ["openid", "profile", "email"],
            "audience": [],
            "public": False,
            "enforce_pkce": True,
            "auth_method": "client_secret_basic"
        }
        
        success, created_client = self.run_test(
            "Create OIDC Client", 
            "POST", 
            "clients", 
            200, 
            client_data
        )
        if not success:
            return False
        
        self.created_resources['oidc_clients'].append(created_client['client_id'])
        print(f"   Created OIDC client ID: {created_client['client_id']}")

        # 3. Get specific OIDC client
        success, retrieved_client = self.run_test(
            "Get OIDC Client", 
            "GET", 
            f"clients/{created_client['client_id']}", 
            200
        )
        if not success or retrieved_client['client_id'] != created_client['client_id']:
            return False

        # 4. Update OIDC client
        updated_data = client_data.copy()
        updated_data['scopes'] = ["openid", "profile", "email", "offline_access"]
        updated_data['public'] = True
        
        success, updated_client = self.run_test(
            "Update OIDC Client", 
            "PUT", 
            f"clients/{created_client['client_id']}", 
            200, 
            updated_data
        )
        if not success:
            return False

        # 5. Verify update
        if updated_client['public'] != True or 'offline_access' not in updated_client['scopes']:
            print("❌ OIDC Client update verification failed")
            return False

        # 6. Test duplicate client (should fail)
        success, _ = self.run_test(
            "Create Duplicate OIDC Client", 
            "POST", 
            "clients", 
            400, 
            client_data
        )
        if not success:
            print("⚠️  Duplicate OIDC client creation should fail with 400")

        # 7. Delete OIDC client
        success, _ = self.run_test(
            "Delete OIDC Client", 
            "DELETE", 
            f"clients/{created_client['client_id']}", 
            200
        )
        if success:
            self.created_resources['oidc_clients'].remove(created_client['client_id'])
        
        return success

    # SAML Client Tests (Applications)  
    def test_saml_clients(self) -> bool:
        """Test complete SAML client CRUD operations"""
        print("\n=== SAML CLIENT TESTS ===")
        
        # 1. List SAML clients
        success, clients = self.run_test("List SAML Clients", "GET", "saml-clients", 200)
        if not success:
            return False

        # 2. Create SAML client
        saml_client_data = {
            "entity_id": f"https://test-sp-{datetime.now().strftime('%H%M%S')}.example.com",
            "name": "Test SAML Service Provider",
            "tenant_id": "default",
            "acs_url": "https://test-sp.example.com/acs",
            "sp_certificate": "",
            "sign_response": True,
            "sign_assertion": True,
            "encrypt_assertion": False,
            "force_authn": False,
            "attribute_mapping": {
                "email": "user_email",
                "name": "displayName"
            }
        }
        
        success, created_saml_client = self.run_test(
            "Create SAML Client", 
            "POST", 
            "saml-clients", 
            201, 
            saml_client_data
        )
        if not success:
            return False
        
        self.created_resources['saml_clients'].append(created_saml_client['id'])
        print(f"   Created SAML client ID: {created_saml_client['id']}")

        # 3. Get specific SAML client
        success, retrieved_saml_client = self.run_test(
            "Get SAML Client", 
            "GET", 
            f"saml-clients/{created_saml_client['id']}", 
            200
        )
        if not success or retrieved_saml_client['entity_id'] != saml_client_data['entity_id']:
            return False

        # 4. Update SAML client
        updated_saml_data = saml_client_data.copy()
        updated_saml_data['encrypt_assertion'] = True
        updated_saml_data['attribute_mapping'] = {
            "email": "user_email",
            "name": "displayName",
            "department": "dept"
        }
        
        success, updated_saml_client = self.run_test(
            "Update SAML Client", 
            "PUT", 
            f"saml-clients/{created_saml_client['id']}", 
            200, 
            updated_saml_data
        )
        if not success or updated_saml_client['encrypt_assertion'] != True:
            return False

        # 5. Test duplicate entity_id (should fail)
        success, _ = self.run_test(
            "Create Duplicate SAML Client", 
            "POST", 
            "saml-clients", 
            400, 
            saml_client_data
        )
        if not success:
            print("⚠️  Duplicate SAML client creation should fail with 400")

        # 6. Delete SAML client
        success, _ = self.run_test(
            "Delete SAML Client", 
            "DELETE", 
            f"saml-clients/{created_saml_client['id']}", 
            200
        )
        if success:
            self.created_resources['saml_clients'].remove(created_saml_client['id'])
        
        return success

    def test_saml_connections(self) -> bool:
        """Test complete SAML connection CRUD operations"""
        print("\n=== SAML CONNECTION TESTS ===")
        
        # 1. List SAML connections
        success, connections = self.run_test("List SAML Connections", "GET", "saml-connections", 200)
        if not success:
            return False

        # 2. Create SAML connection
        saml_data = {
            "name": f"Test SAML {datetime.now().strftime('%H%M%S')}",
            "tenant_id": "default",
            "idp_metadata_xml": """<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="test-idp">
  <IDPSSODescriptor WantAuthnRequestsSigned="false" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://test.example.com/sso"/>
  </IDPSSODescriptor>
</EntityDescriptor>""",
            "force_authn": False,
            "sign_request": True
        }
        
        success, created_saml = self.run_test(
            "Create SAML Connection", 
            "POST", 
            "saml-connections", 
            200, 
            saml_data
        )
        if not success:
            return False
        
        self.created_resources['saml_connections'].append(created_saml['id'])
        print(f"   Created SAML connection ID: {created_saml['id']}")

        # 3. Get specific SAML connection
        success, retrieved_saml = self.run_test(
            "Get SAML Connection", 
            "GET", 
            f"saml-connections/{created_saml['id']}", 
            200
        )
        if not success or retrieved_saml['name'] != saml_data['name']:
            return False

        # 4. Update SAML connection
        updated_saml_data = saml_data.copy()
        updated_saml_data['name'] = f"Updated SAML {datetime.now().strftime('%H%M%S')}"
        updated_saml_data['force_authn'] = True
        
        success, updated_saml = self.run_test(
            "Update SAML Connection", 
            "PUT", 
            f"saml-connections/{created_saml['id']}", 
            200, 
            updated_saml_data
        )
        if not success or updated_saml['force_authn'] != True:
            return False

        # 5. Test invalid XML (should fail)
        invalid_xml_data = saml_data.copy()
        invalid_xml_data['idp_metadata_xml'] = "invalid xml content"
        
        success, _ = self.run_test(
            "Create SAML with Invalid XML", 
            "POST", 
            "saml-connections", 
            400, 
            invalid_xml_data
        )
        if not success:
            print("⚠️  Invalid XML should fail with 400")

        # 6. Delete SAML connection
        success, _ = self.run_test(
            "Delete SAML Connection", 
            "DELETE", 
            f"saml-connections/{created_saml['id']}", 
            200
        )
        if success:
            self.created_resources['saml_connections'].remove(created_saml['id'])
        
        return success

    def test_oidc_connections(self) -> bool:
        """Test complete OIDC connection CRUD operations"""
        print("\n=== OIDC CONNECTION TESTS ===")
        
        # 1. List OIDC connections
        success, connections = self.run_test("List OIDC Connections", "GET", "oidc-connections", 200)
        if not success:
            return False

        # 2. Create OIDC connection
        oidc_data = {
            "name": f"Test OIDC {datetime.now().strftime('%H%M%S')}",
            "tenant_id": "default",
            "issuer_url": "https://accounts.google.com",
            "client_id": f"test-client-id-{datetime.now().strftime('%H%M%S')}",
            "client_secret": "test-client-secret-12345",
            "scopes": ["openid", "email", "profile"]
        }
        
        success, created_oidc = self.run_test(
            "Create OIDC Connection", 
            "POST", 
            "oidc-connections", 
            200, 
            oidc_data
        )
        if not success:
            return False
        
        self.created_resources['oidc_connections'].append(created_oidc['id'])
        print(f"   Created OIDC connection ID: {created_oidc['id']}")

        # 3. Get specific OIDC connection
        success, retrieved_oidc = self.run_test(
            "Get OIDC Connection", 
            "GET", 
            f"oidc-connections/{created_oidc['id']}", 
            200
        )
        if not success or retrieved_oidc['name'] != oidc_data['name']:
            return False

        # 4. Update OIDC connection
        updated_oidc_data = oidc_data.copy()
        updated_oidc_data['name'] = f"Updated OIDC {datetime.now().strftime('%H%M%S')}"
        updated_oidc_data['scopes'] = ["openid", "email", "profile", "offline_access"]
        
        success, updated_oidc = self.run_test(
            "Update OIDC Connection", 
            "PUT", 
            f"oidc-connections/{created_oidc['id']}", 
            200, 
            updated_oidc_data
        )
        if not success or 'offline_access' not in updated_oidc['scopes']:
            return False

        # 5. Delete OIDC connection
        success, _ = self.run_test(
            "Delete OIDC Connection", 
            "DELETE", 
            f"oidc-connections/{created_oidc['id']}", 
            200
        )
        if success:
            self.created_resources['oidc_connections'].remove(created_oidc['id'])
        
        return success

    # Tenants Tests
    def test_tenants(self) -> bool:
        """Test complete Tenants CRUD operations"""
        print("\n=== TENANTS TESTS ===")
        
        # 1. List tenants (should include at least default)
        success, tenants = self.run_test("List Tenants", "GET", "tenants", 200)
        if not success:
            return False
        
        # Should have at least the default tenant
        default_tenant_exists = any(t.get('name') == 'default' for t in tenants)
        if not default_tenant_exists:
            print("❌ Default tenant should always exist")
            return False

        # 2. Create a new tenant
        tenant_data = {
            "name": f"test-tenant-{datetime.now().strftime('%H%M%S')}",
            "display_name": "Test Tenant Organization",
            "description": "A test tenant for automated testing"
        }
        
        success, created_tenant = self.run_test(
            "Create Tenant", 
            "POST", 
            "tenants", 
            201, 
            tenant_data
        )
        if not success:
            return False
        
        self.created_resources['tenants'].append(created_tenant['id'])
        print(f"   Created tenant ID: {created_tenant['id']}")

        # 3. Get specific tenant
        success, retrieved_tenant = self.run_test(
            "Get Tenant", 
            "GET", 
            f"tenants/{created_tenant['id']}", 
            200
        )
        if not success or retrieved_tenant['name'] != tenant_data['name']:
            return False

        # 4. Update tenant (not default)
        updated_tenant_data = tenant_data.copy()
        updated_tenant_data['display_name'] = "Updated Test Tenant"
        updated_tenant_data['description'] = "An updated test tenant"
        
        success, updated_tenant = self.run_test(
            "Update Tenant", 
            "PUT", 
            f"tenants/{created_tenant['id']}", 
            200, 
            updated_tenant_data
        )
        if not success or updated_tenant['display_name'] != "Updated Test Tenant":
            return False

        # 5. Test duplicate tenant name (should fail)
        success, _ = self.run_test(
            "Create Duplicate Tenant", 
            "POST", 
            "tenants", 
            400, 
            tenant_data
        )
        if not success:
            print("⚠️  Duplicate tenant creation should fail with 400")

        # 6. Test creating tenant with 'default' name (should fail)
        default_tenant_data = {"name": "default", "display_name": "Another Default"}
        success, _ = self.run_test(
            "Create Tenant Named 'default'", 
            "POST", 
            "tenants", 
            400, 
            default_tenant_data
        )
        if not success:
            print("⚠️  Creating tenant named 'default' should fail with 400")

        # 7. Test updating default tenant (should fail)
        success, _ = self.run_test(
            "Update Default Tenant", 
            "PUT", 
            "tenants/default", 
            400, 
            {"name": "default", "display_name": "Modified Default"}
        )
        if not success:
            print("⚠️  Updating default tenant should fail with 400")

        # 8. Test deleting default tenant (should fail)
        success, _ = self.run_test(
            "Delete Default Tenant", 
            "DELETE", 
            "tenants/default", 
            400
        )
        if not success:
            print("⚠️  Deleting default tenant should fail with 400")

        # 9. Delete created tenant
        success, _ = self.run_test(
            "Delete Tenant", 
            "DELETE", 
            f"tenants/{created_tenant['id']}", 
            200
        )
        if success:
            self.created_resources['tenants'].remove(created_tenant['id'])
        
        return success

    def test_error_scenarios(self) -> bool:
        """Test various error scenarios"""
        print("\n=== ERROR SCENARIO TESTS ===")
        
        # Test 404 scenarios
        success, _ = self.run_test("Get Non-existent OIDC Client", "GET", "clients/non-existent", 404)
        if not success:
            return False
            
        success, _ = self.run_test("Get Non-existent SAML Client", "GET", "saml-clients/non-existent", 404)
        if not success:
            return False
            
        success, _ = self.run_test("Get Non-existent SAML Connection", "GET", "saml-connections/non-existent", 404)
        if not success:
            return False
            
        success, _ = self.run_test("Get Non-existent OIDC Connection", "GET", "oidc-connections/non-existent", 404)
        if not success:
            return False

        success, _ = self.run_test("Get Non-existent Tenant", "GET", "tenants/non-existent", 404)
        if not success:
            return False

        # Test delete non-existent resources
        success, _ = self.run_test("Delete Non-existent OIDC Client", "DELETE", "clients/non-existent", 404)
        if not success:
            return False

        success, _ = self.run_test("Delete Non-existent SAML Client", "DELETE", "saml-clients/non-existent", 404)
        if not success:
            return False

        return True

    def cleanup_resources(self):
        """Clean up any remaining test resources"""
        print("\n=== CLEANUP ===")
        
        for client_id in self.created_resources['oidc_clients']:
            try:
                self.run_test(f"Cleanup OIDC Client {client_id}", "DELETE", f"clients/{client_id}", 200)
            except:
                pass

        for client_id in self.created_resources['saml_clients']:
            try:
                self.run_test(f"Cleanup SAML Client {client_id}", "DELETE", f"saml-clients/{client_id}", 200)
            except:
                pass
                
        for saml_id in self.created_resources['saml_connections']:
            try:
                self.run_test(f"Cleanup SAML Connection {saml_id}", "DELETE", f"saml-connections/{saml_id}", 200)
            except:
                pass
                
        for oidc_id in self.created_resources['oidc_connections']:
            try:
                self.run_test(f"Cleanup OIDC Connection {oidc_id}", "DELETE", f"oidc-connections/{oidc_id}", 200)
            except:
                pass

        for tenant_id in self.created_resources['tenants']:
            try:
                self.run_test(f"Cleanup Tenant {tenant_id}", "DELETE", f"tenants/{tenant_id}", 200)
            except:
                pass

    def run_all_tests(self) -> bool:
        """Run all backend API tests"""
        print("🚀 Starting Shyntr IAM Backend API Tests - Iteration 2")
        print(f"Base URL: {self.base_url}")
        print("=" * 60)
        
        all_tests_passed = True
        
        try:
            # Test dashboard stats
            if not self.test_dashboard_stats():
                all_tests_passed = False
            
            # Test OIDC clients (Applications)
            if not self.test_oidc_clients():
                all_tests_passed = False

            # Test SAML clients (Applications)
            if not self.test_saml_clients():
                all_tests_passed = False
            
            # Test SAML connections (Providers)
            if not self.test_saml_connections():
                all_tests_passed = False
            
            # Test OIDC connections (Providers)
            if not self.test_oidc_connections():
                all_tests_passed = False

            # Test Tenants
            if not self.test_tenants():
                all_tests_passed = False
                
            # Test error scenarios
            if not self.test_error_scenarios():
                all_tests_passed = False
                
        finally:
            # Always cleanup
            self.cleanup_resources()
        
        # Print results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if all_tests_passed and self.tests_passed == self.tests_run:
            print("🎉 All backend API tests passed!")
            return True
        else:
            print("❌ Some backend API tests failed!")
            return False

def main():
    tester = ShyntrAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())