import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AnprService {
  // Replace with your actual free API key from PlateRecognizer
  private apiKey = '1187d60d0753812b132fd36daa62b9ada27c0ca5'; 
  private apiUrl = 'https://api.platerecognizer.com/v1/plate-reader/';

  constructor(private http: HttpClient) {}

  scanLicensePlate(imageFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('upload', imageFile);
    // Optional: Tell it to look specifically for Indian plates for higher accuracy
    formData.append('regions', 'in'); 

    const headers = new HttpHeaders({
      'Authorization': `Token ${this.apiKey}`
    });

    return this.http.post(this.apiUrl, formData, { headers });
  }
}