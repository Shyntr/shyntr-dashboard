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

    # OAuth2 Client Tests
    def test_oauth2_clients(self) -> bool:
        """Test complete OAuth2 client CRUD operations"""
        print("\n=== OAuth2 CLIENT TESTS ===")
        
        # 1. List clients (should be empty initially or return existing)
        success, clients = self.run_test("List OAuth2 Clients", "GET", "clients", 200)
        if not success:
            return False

        # 2. Create a client
        client_data = {
            "id": f"test-client-{datetime.now().strftime('%H%M%S')}",
            "tenant_id": "default",
            "redirect_uris": ["https://app.example.com/callback"],
            "grant_types": ["authorization_code", "refresh_token"],
            "response_types": ["code"],
            "scopes": ["openid", "profile", "email"],
            "public": False,
            "enforce_pkce": True,
            "allowed_cors_origins": ["https://app.example.com"]
        }
        
        success, created_client = self.run_test(
            "Create OAuth2 Client", 
            "POST", 
            "clients", 
            200, 
            client_data
        )
        if not success:
            return False
        
        self.created_resources['clients'].append(created_client['id'])
        print(f"   Created client ID: {created_client['id']}")

        # 3. Get specific client
        success, retrieved_client = self.run_test(
            "Get OAuth2 Client", 
            "GET", 
            f"clients/{created_client['id']}", 
            200
        )
        if not success or retrieved_client['id'] != created_client['id']:
            return False

        # 4. Update client
        updated_data = client_data.copy()
        updated_data['scopes'] = ["openid", "profile", "email", "offline_access"]
        updated_data['public'] = True
        
        success, updated_client = self.run_test(
            "Update OAuth2 Client", 
            "PUT", 
            f"clients/{created_client['id']}", 
            200, 
            updated_data
        )
        if not success:
            return False

        # 5. Verify update
        if updated_client['public'] != True or 'offline_access' not in updated_client['scopes']:
            print("❌ Client update verification failed")
            return False

        # 6. Test client with invalid ID (should fail)
        success, _ = self.run_test(
            "Create Duplicate Client", 
            "POST", 
            "clients", 
            400, 
            client_data
        )
        if not success:
            print("⚠️  Duplicate client creation should fail with 400")

        # 7. Delete client
        success, _ = self.run_test(
            "Delete OAuth2 Client", 
            "DELETE", 
            f"clients/{created_client['id']}", 
            200
        )
        if success:
            self.created_resources['clients'].remove(created_client['id'])
        
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

    def test_error_scenarios(self) -> bool:
        """Test various error scenarios"""
        print("\n=== ERROR SCENARIO TESTS ===")
        
        # Test 404 scenarios
        success, _ = self.run_test("Get Non-existent Client", "GET", "clients/non-existent", 404)
        if not success:
            return False
            
        success, _ = self.run_test("Get Non-existent SAML", "GET", "saml-connections/non-existent", 404)
        if not success:
            return False
            
        success, _ = self.run_test("Get Non-existent OIDC", "GET", "oidc-connections/non-existent", 404)
        if not success:
            return False

        # Test delete non-existent resources
        success, _ = self.run_test("Delete Non-existent Client", "DELETE", "clients/non-existent", 404)
        if not success:
            return False

        return True

    def cleanup_resources(self):
        """Clean up any remaining test resources"""
        print("\n=== CLEANUP ===")
        
        for client_id in self.created_resources['clients']:
            try:
                self.run_test(f"Cleanup Client {client_id}", "DELETE", f"clients/{client_id}", 200)
            except:
                pass
                
        for saml_id in self.created_resources['saml_connections']:
            try:
                self.run_test(f"Cleanup SAML {saml_id}", "DELETE", f"saml-connections/{saml_id}", 200)
            except:
                pass
                
        for oidc_id in self.created_resources['oidc_connections']:
            try:
                self.run_test(f"Cleanup OIDC {oidc_id}", "DELETE", f"oidc-connections/{oidc_id}", 200)
            except:
                pass

    def run_all_tests(self) -> bool:
        """Run all backend API tests"""
        print("🚀 Starting Shyntr IAM Backend API Tests")
        print(f"Base URL: {self.base_url}")
        print("=" * 50)
        
        all_tests_passed = True
        
        try:
            # Test dashboard stats
            if not self.test_dashboard_stats():
                all_tests_passed = False
            
            # Test OAuth2 clients
            if not self.test_oauth2_clients():
                all_tests_passed = False
            
            # Test SAML connections
            if not self.test_saml_connections():
                all_tests_passed = False
            
            # Test OIDC connections
            if not self.test_oidc_connections():
                all_tests_passed = False
                
            # Test error scenarios
            if not self.test_error_scenarios():
                all_tests_passed = False
                
        finally:
            # Always cleanup
            self.cleanup_resources()
        
        # Print results
        print("\n" + "=" * 50)
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