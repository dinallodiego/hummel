import { Component } from '@angular/core';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-nosotros',
  templateUrl: './nosotros.component.html',
  styleUrls: ['./nosotros.component.css'],
})
export class NosotrosComponent {
  constructor() {
    // Rotación automática del slider cada 4 segundos
  }

  swalBase = {
    customClass: {
      popup: 'swal-popup',
      title: 'swal-title',
      confirmButton: 'swal-confirm',
      cancelButton: 'swal-cancel',
      input: 'swal-input',
    },
    buttonsStyling: false,
    width: '100%',
    padding: '1.2rem',
    backdrop: 'rgba(0,0,0,0.5)',
  };

   mostrarLocales() {
    Swal.fire({
      ...this.swalBase,
      width: '420px', 
      padding: '1.5rem',
      title: `
        <div style="display:flex; align-items:center; justify-content:center; gap:15px; padding-top: 5px;">
          <div style="background: #20c997; width: 45px; height: 45px; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 5px 15px rgba(32,201,151,0.3);">
            <i class="bi bi-geo-alt-fill" style="font-size: 22px; color: #000;"></i>
          </div>
          <h2 style="font-family: 'Montserrat', sans-serif; font-weight: 900; font-size: 20px; color: #111; text-transform: uppercase; letter-spacing: 1px; margin: 0;">Encontranos</h2>
        </div>
      `,
      html: `
        <div style="display:flex; flex-direction:column; gap:12px; margin-top: 15px; overflow: hidden;">
          
          <div style="background: #f8f9fa; border: 2px solid #20c997; border-radius: 15px; padding: 12px; text-align: center;">
            <p style="font-size: 15px; color: #000; font-weight: 900; margin-bottom: 2px; text-transform: uppercase;">Ramos Mejía</p>
            <p style="font-size: 13px; color: #444; margin: 0; font-weight: 600;">
              Belgrano 69, Local 26 <br> 
              <span style="color: #20c997; font-weight: 800; font-size: 11px;">GALERÍA GRAN RIVADAVIA</span>
            </p>
          </div>
  
          <div style="background: #111; border-radius: 15px; padding: 15px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #20c997; font-size: 11px; font-weight: 800; text-transform: uppercase;">Mar a Vie</span>
              <span style="color: #fff; font-size: 12px; font-weight: 700;">10:30 - 19:30 hs</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid #333;">
              <span style="color: #20c997; font-size: 11px; font-weight: 800; text-transform: uppercase;">Sábados</span>
              <span style="color: #fff; font-size: 12px; font-weight: 700;">10:30 - 15:00 hs</span>
            </div>
          </div>
  
          <a href="https://maps.app.goo.gl/tkifYi3orEt9gP7f7" target="_blank" 
             style="text-decoration:none; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; border-radius: 12px; background: #20c997; color: #000; font-size: 13px; font-weight: 900; text-transform: uppercase; transition: 0.3s; border: 2px solid #20c997;">
            <i class="bi bi-cursor-fill"></i> Ver Ubicación
          </a>
  
          <div style="font-size: 15px; color: #ff4d4d; font-weight: 900; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
             Lunes y feriados cerrado
          </div>
        </div>`,
      confirmButtonText: 'Cerrar',
      
    });
  }

  mostrarPoliticasDeCompra() {
    Swal.fire({
      ...this.swalBase,
      title: '¿Como comprar en nuestro sitio?',
      html: `
        <div style="display:flex; flex-direction:column; gap:12px">
  
          <div style="
            border:1px solid #eee;
            border-radius:12px;
            padding:14px;
            background:#fafafa;
          ">
            <div style="font-size:13px; color:#555; line-height:1.5;">
              1. Explora nuestro catálogo y elige tus productos favoritos.<br>
              2. Agrega los productos a tu carrito de compras.<br>
              3. Continua en finalizar compra donde mediante una transferencia inmediata pagas tu pedido.<br>
              4. Completas nuestro formulario con algunos datos. <strong>Aqui deberas sumar el comprobante de la transferencia para validarlo.</strong>.<br><br>
              5. Confirma el pago y tu pedido pasara a estar pendiente de compra.<br>
              6. Podras acceder a tus compras mediante tu DNI o numero de pedido que se te proporcionará para ver el estado de tu compra.<br>
              7. Una vez validada la transferencia, preparamos tu pedido para su envío o retiro en local.<br>
              8. Recibe tu pedido en la comodidad de tu hogar o retíralo en nuestro local.<br><br>
              Si tienes alguna pregunta, no dudes en contactarnos. ¡Gracias por elegirnos para tus compras!
            </div>
          </div>
  
        </div>
      `,
      confirmButtonText: 'Cerrar',
    });
  }
}
