import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  imports: [CommonModule , FormsModule],
  styleUrl: './login.css'
})
export class LoginComponent {

  email = '';
  password = '';

  constructor(private auth: AuthService, private router: Router){}

  login(){

    const success = this.auth.login(this.email, this.password);

    if(success){

      Swal.fire({
        icon: 'success',
        title: 'Bienvenido al panel',
        text: 'Acceso concedido',
        showConfirmButton:false,
        timer:1500
      }).then(()=>{

        this.router.navigate(['/admin']);

      });

    } else {

      Swal.fire({
        icon:'error',
        title:'Acceso denegado',
        text:'Email o contraseña incorrectos'
      });

    }

  }

}