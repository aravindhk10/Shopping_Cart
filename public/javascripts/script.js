function addToCart(proId){
    $.ajax({
        url:'/add-to-cart/'+proId,
        method:'GET',
        success:(response)=>{
            if (response.status){
                let count = $('#cartcount').html()
                count = parseInt(count)+1
                $('#cartcount').html(count)
            }
            
        }
    })
}