import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // Importante para que funcione el routerLink
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, OnDestroy {
  currentIndex = 0;
  private intervalId: any;

  constructor(private router: Router) {}

  images = ['/assets/slider1.png', '/assets/slider2.jpg', '/assets/slider3.jpg'];

  destacados = [
    {
      id: 1,
      nombre: 'Campera',
      categoria: 'Running',
      precio: 85000,
      imagen: '',
    },
    {
      id: 2,
      nombre: 'Gorra',
      categoria: 'Entrenamiento',
      precio: 25000,
      imagen: '',
    },
    {
      id: 3,
      nombre: 'Mochila',
      categoria: 'Basket',
      precio: 32000,
      imagen: '',
    },
  ];

  ngOnInit() {
    this.startAutoPlay();
  }

  ngOnDestroy() {
    this.stopAutoPlay();
  }

  startAutoPlay() {
    // Se ejecuta cada 5 segundos automáticamente
    this.intervalId = setInterval(() => {
      this.next();
    }, 5000);
  }

  stopAutoPlay() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
  }

  prev() {
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
  }

  setSlide(index: number) {
    this.currentIndex = index;
    // Reiniciamos el autoplay cuando el usuario toca un indicador
    this.stopAutoPlay();
    this.startAutoPlay();
  }

  irCategoria(genero: string) {
    this.router.navigate(['/productos'], {
      queryParams: { genero },
    });
  }
}
