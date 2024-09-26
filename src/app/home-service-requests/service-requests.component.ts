import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

// Define an interface for the leave document
interface LeaveDocument {
  id: string;
  key: string;
  value: {
    _id: string;
    _rev: string;
    type: string;
    employee: string;
    leaveType: string;
    leaveReason: string;
    startDate: string;
    endDate: string;
    leaveDays: string;
    lossOfPay: string;
    date: string;
  };
}

import { CouchdbService } from '../couchdb.service'; // Adjust import path

@Component({
  selector: 'app-service-requests',
  templateUrl: './service-requests.component.html',
  styleUrls: ['./service-requests.component.css']
})
export class ServiceRequestsComponent implements OnInit, OnDestroy {
  serviceRequestIds: string[] = [];
  employee: any = null;
  leaveDetails: any = null;
  employeeId: string = ''; // Initialize as empty or null
  private changesSubscription: EventSource | undefined;
  private url = 'https://192.168.57.185:5984/employee-db/_changes?feed=continuous&include_docs=true';
  isLeaveReportOpen: boolean = false; // Control the dropdown visibility

  constructor(
    private http: HttpClient,
    private router: Router,
    private couchdbService: CouchdbService
  ) {}

  ngOnInit(): void {
    this.employeeId = sessionStorage.getItem('employeeId') || ''; // Retrieve the employee ID from sessionStorage
    if (this.employeeId) {
      this.fetchServiceRequests();
    } else {
      console.error('No employee ID found in session storage.');
    }

    this.fetchEmployeeDetails(); // Fetch employee data when the component loads
    this.listenForChanges(); // Start listening for CouchDB changes
  }

  isLeaveMenuOpen: boolean = false;

  toggleLeaveMenu() {
    this.isLeaveMenuOpen = !this.isLeaveMenuOpen;
  }
  showMyDetails(): void {
    this.router.navigate(['/my-details']);
  }

  showLeaveDetails(): void {
    this.router.navigate(['/leave-details']);
    this.isLeaveReportOpen = !this.isLeaveReportOpen; // Toggle the dropdown
  }

  showServiceRequests(): void {
    this.router.navigate(['/service-requests']); // Define the route for service requests
  }

  showDekstopSupport(): void {
    this.router.navigate(['/dekstop-support']); // Define the route for service requests
  }
  
  showLeaveSummary(): void {
    this.router.navigate(['/leave-report']);
  }

  home(): void {
    this.router.navigate(['/home']);
  }

  logout(): void {
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }

  fetchEmployeeDetails(): void {
    const employeeId = sessionStorage.getItem('employeeId');
    if (employeeId) {
      const employeeUrl = `https://192.168.57.185:5984/employee-db/employee_2_${employeeId}`;
      const leaveUrl = `https://192.168.57.185:5984/employee-db/_design/leave/_view/by_employee?key="${employeeId}"`;
      const headers = new HttpHeaders({
        'Authorization': 'Basic ' + btoa('d_couchdb:Welcome#2')
      });

      // Fetch employee details
      this.http.get<any>(employeeUrl, { headers }).subscribe(
        (employeeResponse) => {
          if (employeeResponse && employeeResponse.data) {
            this.employee = employeeResponse.data;

            // Fetch leave records
            this.http.get<{ rows: LeaveDocument[] }>(leaveUrl, { headers }).subscribe(
              (leaveResponse) => {
                if (leaveResponse && leaveResponse.rows) {
                  this.leaveDetails = {
                    leaveBalance: 0, // Initialize as needed
                    casualLeaveBalance: 0,
                    medicalLeaveBalance: 0,
                    Leaves: leaveResponse.rows.map(row => row.value)
                  };
                } else {
                  console.error('No leave data found in the response.');
                }
              },
              (error) => {
                console.error('Error fetching leave data:', error);
              }
            );
          } else {
            console.error('No employee data found in the response.');
          }
        },
        (error) => {
          console.error('Error fetching employee data:', error);
        }
      );
    } else {
      console.error('No employee ID found in session storage.');
    }
  }

  fetchServiceRequests(): void {
    if (!this.employeeId) {
      console.error('Employee ID is not set.');
      return;
    }

    console.log('Fetching service requests for employee ID:', this.employeeId);
    this.couchdbService.getServiceRequestsByEmployee(this.employeeId).subscribe(
      (ids) => {
        console.log('Fetched service request IDs:', ids);
        this.serviceRequestIds = ids; // Update the list of service request IDs
      },
      (error) => {
        console.error('Error fetching service requests:', error);
      }
    );
  }

  listenForChanges(): void {
    // Use EventSource for continuous updates
    this.changesSubscription = new EventSource(this.url);
    this.changesSubscription.onmessage = (event) => {
      // Handle the incoming changes
      this.fetchEmployeeDetails(); // Re-fetch data as needed
    };
    this.changesSubscription.onerror = (error) => {
      console.error('EventSource error:', error);
    };
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': 'Basic ' + btoa('d_couchdb:Welcome#2')
    });
  }

  ngOnDestroy(): void {
    // Close the EventSource connection when the component is destroyed
    if (this.changesSubscription) {
      this.changesSubscription.close();
    }
  }
}
